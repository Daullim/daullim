#!/usr/bin/env python
"""LORO 교차검증 — 시도 하나를 빼고 학습해 그 시도에서 채점 (이슈 #29).

    ./.venv/bin/python -u run_loro.py [--refit-beta]

답하는 것: 데이터 의존 파라미터(클래스별 m·λ̄, V⊥ 백분위)의 지역 간 전이 여부 —
학습 2시도에서만 적합, 홀드아웃 시도 건물을 그 파라미터로 채점.

답하지 못하는 것: 미래 예측력. λ̂와 라벨이 같은 화재로 만들어져 λ̂ 항은 인샘플 —
홀드아웃 화재를 빼면 λ̂가 사전값으로 뭉개져 모델이 사라지므로 제외 불가.
시간 분할로만 해소되나 화재 데이터가 2023 단년이라 현재 불가능.

결론: 아래 수치는 지역 간 전이 지표이지 절대 성능 아님.
"""

from __future__ import annotations

import argparse
import sys

import pandas as pd

from daullim_data.ltr import capture_rate_ci, fit_with_ci
from daullim_data.utils import DataTrapError
from daullim_data.vulnerability import Betas, relative_risk
from run_ltr import SGG_OF, attach_labels
from run_scoring import build_scored
from run_vulnerability import AS_OF

LABEL = "fire_label"  # 사망 라벨은 4건(전북 0)이라 홀드아웃 지표가 성립하지 않는다
TOP_FRAC = 0.10

SIDO_OF_KEY = {key: sido for key, (sido, _sgg) in SGG_OF.items()}
SIDOS = tuple(dict.fromkeys(SIDO_OF_KEY.values()))


def labels_by_building() -> pd.Series:
    """건물별 라벨 1회 생성.

    라벨은 최근접 매칭이라 학습 범위와 무관 — 폴드마다 재계산하면 중복 비용(수십 초)에
    더해 '폴드별로 라벨이 달라 보이는' 착시를 만든다.
    """
    scored, _ = build_scored()
    scored = relative_risk(scored, betas=Betas(), as_of=AS_OF)
    labeled = attach_labels(scored)
    return labeled.set_index("bld_key")[LABEL]


def fold(holdout: str, labels: pd.Series, *, refit_beta: bool) -> dict:
    """홀드아웃 시도 하나에 대한 폴드 결과."""
    train = tuple(s for s in SIDOS if s != holdout)
    scored, params = build_scored(fit_sidos=train)
    scored["sido"] = scored["region_key"].map(SIDO_OF_KEY)
    scored[LABEL] = scored["bld_key"].map(labels).fillna(False).astype(bool)

    betas = Betas()
    beta_note = "v0"
    if refit_beta:
        # 학습 시도 안에서만 재학습 — 홀드아웃 라벨을 보면 그 자체가 누수다.
        tr = scored.loc[scored["sido"].isin(train)]
        res = fit_with_ci(relative_risk(tr, betas=betas, as_of=AS_OF), label=LABEL, group="grid1k")
        if res.significant.all():
            betas = Betas(age=float(res.beta[0]), struct=float(res.beta[1]), prior=float(res.beta[2]))
            beta_note = "재학습(전 계수 유의)"
        else:
            beta_note = "재학습 시도 → CI가 0 포함, v0 유지"

    scored = relative_risk(scored, betas=betas, as_of=AS_OF)
    scored["model"] = scored["lambda_hat"] * scored["area_mult"] * scored["rr_i"]
    # ②③만(λ̂ 제외) — 라벨 화재가 들어가지 않는 유일한 열, 오염되지 않은 전이 신호
    scored["area_rr"] = scored["area_mult"] * scored["rr_i"]

    te = scored.loc[scored["sido"] == holdout].copy()

    # 베이스라인 — 포집률 단독은 해석 불가, 비교 기준 필요
    scores = {
        "가구수(노출량)": "exposure",
        "②③만(λ̂ 제외)": "area_rr",
        "λ̂만": "lambda_hat",
        "전체 모델": "model",
    }
    caps = {
        name: capture_rate_ci(te, col, LABEL, frac=TOP_FRAC)
        for name, col in scores.items()
    }
    return {
        "holdout": holdout,
        "train": train,
        "n_test": len(te),
        "m_urban": params.m_urban,
        "m_rural": params.m_rural,
        "lambda_bar_urban": params.lambda_bar_urban,
        "beta_note": beta_note,
        "caps": caps,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--refit-beta", action="store_true", help="폴드마다 β를 학습 시도에서 재학습")
    args = ap.parse_args()

    print("=" * 72)
    print("LORO 교차검증 — 시도 단위 Leave-One-Region-Out")
    print("=" * 72)
    print(f"  라벨: 주거화재 발생 · 지표: 포집률@Top{TOP_FRAC:.0%} · CI: 양성 단위 부트스트랩 95%")
    print("  ⚠️ λ̂는 홀드아웃 시도의 화재로 계산된다 — 파라미터 전이 지표이지 미래 예측력이 아니다.")

    labels = labels_by_building()
    print(f"\n  라벨 양성 {int(labels.sum()):,}건 / 건물 {len(labels):,}행")

    results = [fold(h, labels, refit_beta=args.refit_beta) for h in SIDOS]

    print("\n  [폴드별 적합 파라미터] — 세 폴드가 서로 달라야 누수·캐시 버그가 없는 것이다")
    for r in results:
        print(f"    {'+'.join(r['train']):<9} → {r['holdout']:<3} "
              f"m_urban={r['m_urban']:>9.1f} · m_rural={r['m_rural']:>7.1f} "
              f"· λ̄_urban={r['lambda_bar_urban']:.6f} · β {r['beta_note']}")

    print(f"\n  [포집률@Top{TOP_FRAC:.0%}] 홀드아웃 시도 안에서 계산 · [95% CI]")
    names = list(results[0]["caps"])
    print(f"    {'홀드아웃':<6}{'건물':>8}  " + "  ".join(f"{n:^28}" for n in names))
    for r in results:
        row = "  ".join(r["caps"][n].render().center(28) for n in names)
        print(f"    {r['holdout']:<6}{r['n_test']:>8,}  {row}")

    print(f"\n    참고 — 무작위 정렬의 기대값은 {TOP_FRAC:.0%}다.")

    thin = [r["holdout"] for r in results if r["caps"][names[-1]].n_positive < 30]
    if thin:
        print(f"\n  ⚠️ 양성 30건 미만 홀드아웃: {', '.join(thin)} — 구간이 넓은 것은 표본 탓이다.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except DataTrapError as exc:
        print(f"\n[함정 감지 — 중단]\n{exc}", file=sys.stderr)
        sys.exit(2)
