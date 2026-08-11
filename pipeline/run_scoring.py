#!/usr/bin/env python
"""점수·순위 실행 로그 — 세 항 결합 · 정규화 · 타이브레이커 · G2 쿼터 + 검증.

    ./.venv/bin/python -u run_scoring.py
"""

from __future__ import annotations

import json
import sys

import numpy as np
import pandas as pd

from daullim_data.ingest import load_fires
from daullim_data.kernel import estimate_m, lambda_hat, prepare_fires, spread_exposure
from daullim_data.region_type import RURAL, URBAN
from daullim_data.scoring import (
    DANGER_MIN,
    EXPLORE_FRACTION,
    WARN_MIN,
    ScoreParams,
    assign_order,
    basis_text,
    normalize_score,
    raw_score,
    risk_level,
    rural_target,
    rx_code,
)
from daullim_data.utils import DataTrapError, SEED_ROOT, grid1k_centroid, to_5179
from daullim_data.vulnerability import Betas, area_multiplier, relative_risk, residual_vulnerability
from run_region_type import build as build_grids
from run_vulnerability import AS_OF, SIDO_OF, load_buildings

SCORE_VERSION = "v0-20260805"  # varchar(20) — 파라미터는 사이드카에 (ScoreParams 참조)
FIRE_REFERENCE_DAY = pd.Timestamp("2023-12-31")

# 프로세스 캐시 — **학습 범위(fit_sidos)마다 따로** 담는다. 아래 build_scored() 주석 참조.
_SCORED: dict[tuple[str, ...] | None, tuple[pd.DataFrame, ScoreParams]] = {}


def build_scored(
    *, fit_sidos: tuple[str, ...] | None = None, rebuild: bool = False
) -> tuple[pd.DataFrame, ScoreParams]:
    """점수까지 매겨진 건물 테이블. 같은 프로세스·같은 학습 범위에서는 1회만 계산.

    `run_all.py`가 8단계를 한 프로세스에서 `import_module(...).main()`으로 부르는데, 6단계
    (`run_scoring`)·7단계(`run_seed`)가 각자 호출해 계산이 중복됐다 — 실측(4지역·61,803행)
    1회 15.3초, `run_seed.py` 27.6초의 55%가 이 중복이었다.

    파일 캐시(parquet) 미사용 — 무효화 판정이 불필요해서다. 프로세스 종료 시 캐시도 사라져
    스크립트 단독 실행은 항상 재계산되므로 '오래된 산출물'이 남을 자리가 없다. 15초 절약을
    위해 "언제 재생성할지" 판단 상태를 들이면, 오판 시 조용히 옛 데이터가 나온다.

    `fit_sidos`는 LORO 교차검증 전용(`run_loro.py`) — 클래스별 m·λ̄·V⊥ 백분위를 지정 시도에서만
    적합하고 점수는 전체 건물에 매긴다(홀드아웃 시도를 학습에서 제외한 채 채점). 기본 `None`은
    기존 동작과 동일.

    ⚠️ 캐시 키에 `fit_sidos` 포함 — 폴드마다 학습 범위가 다른데 키가 하나면 첫 폴드 결과가
    세 폴드에 재사용돼 조용히 같은 숫자가 나온다.

    `rebuild=True`로 강제 재계산. 반환 DataFrame은 매번 사본(호출부 변형이 다음 호출을 오염
    안 함) — `ScoreParams`는 frozen이라 그대로 공유.
    """
    key = tuple(fit_sidos) if fit_sidos is not None else None
    if key not in _SCORED or rebuild:
        _SCORED[key] = _compute_scored(key)
    scored, params = _SCORED[key]
    return scored.copy(), params


def _compute_scored(
    fit_sidos: tuple[str, ...] | None = None,
) -> tuple[pd.DataFrame, ScoreParams]:
    buildings = load_buildings()
    buildings["x_5179"], buildings["y_5179"] = zip(
        *[to_5179(la, ln) for la, ln in zip(buildings["lat"], buildings["lng"])]
    )

    # 격자별 시도 태깅(LORO 학습/홀드아웃 분리축) — 존 프리픽스가 시도 간 안 겹쳐(서울 다사 /
    # 부산 마라·마마 / 전북 나마·다마·라마) 격자 하나는 시도 하나에만 속함
    frames = []
    for sido in dict.fromkeys(SIDO_OF.values()):
        g = build_grids(sido)
        g["sido"] = sido
        frames.append(g)
    grids = pd.concat(frames, ignore_index=True).drop_duplicates("grid1k")
    xy = [grid1k_centroid(g) for g in grids["grid1k"]]
    grids["x_5179"] = [p[0] for p in xy]
    grids["y_5179"] = [p[1] for p in xy]

    # 학습 범위 — None이면 전체(기존 동작). LORO면 홀드아웃 시도가 빠진다.
    fit_grids = (
        pd.Series(True, index=grids.index)
        if fit_sidos is None
        else grids["sido"].isin(fit_sidos)
    )
    grids["v_perp"] = residual_vulnerability(
        grids, fit_mask=None if fit_sidos is None else fit_grids
    )
    grids["area_mult"] = area_multiplier(grids["v_perp"])

    # ① λ̂ — 주거 화재만, 도농 클래스별 m
    cells = grids.loc[grids["households"].fillna(0) > 0]
    # m·λ̄ 적합용 셀. 화재 지점(sources)은 줄이지 않음 — 홀드아웃 건물 λ̂는 그 지역 화재로
    # 계산돼야 유효, 빼면 λ̂가 사전값으로 뭉개져 모델 자체 소실(LORO=파라미터 전이 검증, 예측력 아님)
    fit_cells = cells.loc[fit_grids.reindex(cells.index, fill_value=True)]
    exposure = spread_exposure(cells[["x_5179", "y_5179", "households"]])
    fires = []
    for sido in dict.fromkeys(SIDO_OF.values()):
        f, _ = load_fires(sido)
        f = f.dropna(subset=["LAT", "LOT"]).copy()
        f["x_5179"], f["y_5179"] = zip(*[to_5179(float(a), float(b)) for a, b in zip(f["LAT"], f["LOT"])])
        fires.append(f)
    sources = prepare_fires(pd.concat(fires, ignore_index=True), reference_day=FIRE_REFERENCE_DAY)

    gmap = grids.set_index("grid1k")
    # 격자 매핑 실패·NO_POP 격자 건물은 URBAN 기본값 처리(확정 결정) — NO_POP은 '인구 0'이지
    # '건물 0'이 아니라 점검 대상임
    cls = buildings["grid1k"].map(gmap["algo_class"])
    buildings["algo_class"] = cls.where(cls.isin([URBAN, RURAL]), URBAN)
    ests = {}
    parts = []
    for cls in (URBAN, RURAL):
        sub_cells = fit_cells.loc[fit_cells["algo_class"] == cls]
        est = estimate_m(sub_cells["residential_fires"].fillna(0), sub_cells["households"])
        ests[cls] = est
        pts = buildings.loc[buildings["algo_class"] == cls]
        if pts.empty:
            continue
        parts.append(lambda_hat(pts, sources, exposure, m=est.m, lambda_bar=est.lambda_bar))
    scored = pd.concat(parts, ignore_index=True)

    # ②③
    scored["area_mult"] = scored["grid1k"].map(gmap["area_mult"]).fillna(1.0)
    scored = relative_risk(scored, betas=Betas(), as_of=AS_OF)
    scored["raw"] = raw_score(scored["lambda_hat"], scored["area_mult"], scored["rr_i"]).values

    # 정규화는 **단일 유니버스**(관악+임실 합산)에서 — 도농 비교가 성립해야 한다
    scored["score"], q_lo, q_hi = normalize_score(scored["raw"])
    scored["risk_level_cd"] = risk_level(scored["score"]).values
    # 저장값 4분류(BUFFER 보존)는 알고리즘 클래스(2분류)와 **다른 축**이다 — 확정 결정 6.
    scored["region_type_cd"] = scored["grid1k"].map(gmap["region_type_cd"]).fillna("URBAN")
    scored["single_ratio"] = scored["grid1k"].map(gmap["single_ratio"])
    scored["fire_distance"] = scored["grid1k"].map(gmap["fire_distance"])
    scored["rural_target"] = (
        rural_target(
            scored["grid1k"].map(gmap["nonapt_ratio"]), scored["grid1k"].map(gmap["elderly_ratio"])
        ).values
        & scored["algo_class"].eq(RURAL).values
    )

    params = ScoreParams(
        version=SCORE_VERSION, q_lo_value=q_lo, q_hi_value=q_hi, alpha=1.0,
        m_urban=ests[URBAN].m, m_rural=ests[RURAL].m,
        lambda_bar_urban=ests[URBAN].lambda_bar, lambda_bar_rural=ests[RURAL].lambda_bar,
        beta_age=Betas().age, beta_struct=Betas().struct,
        computed_at=pd.Timestamp.now().isoformat(timespec="seconds"),
    )
    return scored, params


def validate(df: pd.DataFrame) -> list[str]:
    errs = []
    if not df["score"].between(0, 100).all():
        errs.append("score 0~100 범위 위반")
    if df["order_key"].duplicated().any():
        errs.append("order_key 중복")
    if list(df["order_key"].sort_values()) != list(range(1, len(df) + 1)):
        errs.append("order_key 연속성 위반 (1..N)")
    if not set(df["risk_level_cd"]) <= {"danger", "warn", "ok"}:
        errs.append("risk_level_cd 허용값 위반")
    if not set(df["rx_code_cd"]) <= {"RX-BAT", "RX-IOT"}:
        errs.append("rx_code_cd 허용값 위반")
    frac = df["is_explore"].mean()
    if not 0.05 <= frac <= 0.10:
        errs.append(f"탐사 쿼터 {100 * frac:.1f}% — 5~10% 밖")
    if df["basis"].str.len().max() > 100:
        errs.append("basis varchar(100) 초과")
    return errs


def main() -> int:
    print("=" * 72)
    print("점수·순위 — Score = λ̂ × (1+αV⊥) × exp(Σβx)")
    print("=" * 72)
    scored, params = build_scored()

    print(f"  [정규화] ln(raw) → (q01,q99) robust min-max × 100 · 단일 유니버스 {params.universe}")
    print(f"    ln(raw) q01 {params.q_lo_value:.3f} · q99 {params.q_hi_value:.3f}")
    print(f"    score — 중앙 {scored['score'].median():.1f} · p90 {scored['score'].quantile(.9):.1f} "
          f"· 최소 {scored['score'].min():.1f} · 최대 {scored['score'].max():.1f}")
    lv = scored["risk_level_cd"].value_counts()
    print(f"    risk_level (danger≥{DANGER_MIN:.0f} · warn≥{WARN_MIN:.0f}) — "
          + " · ".join(f"{k} {v:,}({100 * v / len(scored):.1f}%)" for k, v in lv.items()))

    ordered, rep = assign_order(scored)
    ordered["basis"] = basis_text(ordered["order_key"]).values
    ordered["rx_code_cd"] = rx_code(len(ordered)).values
    ordered["score_version"] = params.version
    ordered["computed_at"] = pd.Timestamp.now(tz="Asia/Seoul").isoformat(timespec="seconds")
    print(rep.render())

    print("\n  [도농별 score]")
    for cls in (URBAN, RURAL):
        sub = ordered.loc[ordered["algo_class"] == cls]
        if sub.empty:
            continue
        print(f"    {cls:<6} n={len(sub):>6,} · 중앙 {sub['score'].median():>5.1f} · "
              f"p90 {sub['score'].quantile(.9):>5.1f} · danger {int(sub['risk_level_cd'].eq('danger').sum()):>5,}")
    print(f"    상위 100위 구성: " + " · ".join(
        f"{k} {v}" for k, v in ordered.nsmallest(100, "order_key")["algo_class"].value_counts().items()))

    errs = validate(ordered)
    print()
    if errs:
        print("  [검증 실패]")
        for e in errs:
            print(f"    · {e}")
        return 1
    print(f"  [검증 통과] order_key 1..{len(ordered):,} 유일·연속 · score 0~100 · "
          f"탐사 {100 * ordered['is_explore'].mean():.1f}% · basis ≤100자")

    SEED_ROOT.mkdir(parents=True, exist_ok=True)
    (SEED_ROOT / "score_params.json").write_text(
        json.dumps(params.to_dict(), ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"  score_version={params.version} · 파라미터 → seed/score_params.json")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except DataTrapError as exc:
        print(f"\n[함정 감지 — 중단]\n{exc}", file=sys.stderr)
        sys.exit(2)
