#!/usr/bin/env python
"""β 재학습(LTR) 실행 로그 — 라벨 가용성 감사 → pairwise 학습 → 채택 판정.

    ./.venv/bin/python -u run_ltr.py

**채택 규칙: 부트스트랩 신뢰구간이 0을 포함하면 v0 값을 유지한다.**
노이즈를 계수로 굳히는 것보다 명세값을 쓰는 게 낫다.
"""

from __future__ import annotations

import sys

import numpy as np
import pandas as pd

from daullim_data.ingest import load_fires
from daullim_data.ltr import FEATURES, capture_rate, fit_with_ci
from daullim_data.regions import REGIONS
from daullim_data.scoring import normalize_score, raw_score
from daullim_data.utils import DataTrapError, to_5179
from daullim_data.vulnerability import Betas, relative_risk
from run_scoring import build_scored
from run_vulnerability import AS_OF

SGG_OF = {key: (r.sido, r.name.split()[-1]) for key, r in REGIONS.items()}
NEAREST_LIMIT_M = 150.0  # 화재↔건물 매칭 상한 — 초과 시 라벨 제외


def attach_labels(scored: pd.DataFrame) -> pd.DataFrame:
    """주거화재 지점을 **최근접 건물**에 붙여 건물 단위 라벨을 만든다."""
    out = scored.copy()
    out["fire_label"] = False
    out["death_label"] = False
    for key, (sido, sgg) in SGG_OF.items():
        f, _ = load_fires(sido)
        r = f[f["is_residential"] & f["SGG_NM"].eq(sgg)].dropna(subset=["LAT", "LOT"])
        if r.empty:
            continue
        sub = out.loc[out["region_key"] == key]
        bx = sub["x_5179"].to_numpy(float)
        by = sub["y_5179"].to_numpy(float)
        for _, fire in r.iterrows():
            fx, fy = to_5179(float(fire["LAT"]), float(fire["LOT"]))
            d2 = (bx - fx) ** 2 + (by - fy) ** 2
            i = int(d2.argmin())
            if d2[i] > NEAREST_LIMIT_M**2:
                continue
            idx = sub.index[i]
            out.at[idx, "fire_label"] = True
            if fire["DCSD_CNT"] > 0:
                out.at[idx, "death_label"] = True
    return out


def main() -> int:
    print("=" * 72)
    print("β 재학습 (LTR) — pairwise, 격자 내 쌍")
    print("=" * 72)

    scored, _ = build_scored()
    scored = relative_risk(scored, betas=Betas(), as_of=AS_OF)
    labeled = attach_labels(scored)

    print("  [라벨 가용성 감사]")
    for name, col in (("사망", "death_label"), ("주거화재", "fire_label")):
        n = int(labeled[col].sum())
        grids = int(labeled.loc[labeled[col], "grid1k"].nunique())
        print(f"    {name:<6} 양성 {n:>4,}건 · {grids:>3}격자")
    n_death = int(labeled["death_label"].sum())

    print()
    if n_death < 30:
        print(f"  ⚠️ **사망 라벨 LTR은 성립하지 않는다** — 양성 {n_death}건으로 "
              f"{len(FEATURES)}개 파라미터를 추정할 수 없다.")
        print("     브리프 §7의 '사망 라벨 pairwise LTR'은 시연 2개 시군구 규모에서 재현 불가다.")
        print("     대체 라벨(주거화재 발생)로 진행하되, 이는 **다른 것을 배우는 것**임을 명시한다 —")
        print("     '불이 잦은 곳'과 '사람이 죽는 곳'은 다른 좌표다(w_sev가 존재하는 이유).")
    print()

    print("  [pairwise LTR — 라벨: 주거화재 발생]")
    res = fit_with_ci(labeled, label="fire_label", group="grid1k")
    v0 = {"x1_age": Betas().age, "x2_struct": Betas().struct, "x3_prior": Betas().prior}
    print(res.render(baseline=v0))

    # 라벨이 '위험'이 아니라 '노출량'을 가리키면 학습값은 교란을 계수로 굳힌다.
    pos = labeled.loc[labeled["fire_label"], "unit_count"]
    neg = labeled.loc[~labeled["fire_label"], "unit_count"]
    ratio = float(pos.median()) / max(float(neg.median()), 1.0)
    print("\n  [노출량 교란 검사] 화재는 세대 단위로 나는데 라벨은 건물 단위다")
    print(f"    세대수 중앙 — 양성 {pos.median():.1f} vs 음성 {neg.median():.1f} (배율 {ratio:.1f}배)")
    confounded = ratio >= 2.0
    if confounded:
        print("    ⚠️ 라벨이 세대수에 강하게 교란됐다 — 학습값은 '위험'이 아니라")
        print("       '세대가 많아 라벨을 받을 확률이 높음'을 배운다. **전량 채택 보류.**")

    print("\n  [채택 판정] CI가 0을 포함하거나 노출량 교란이면 v0 유지")
    adopt = {}
    for i, f in enumerate(FEATURES):
        if confounded:
            adopt[f] = v0[f]
            print(f"    {f:<10} 노출량 교란 → v0 {v0[f]:+.3f} 유지")
            continue
        if res.significant[i]:
            adopt[f] = float(res.beta[i])
            print(f"    {f:<10} 학습값 {res.beta[i]:+.3f} 채택")
        else:
            adopt[f] = v0[f]
            print(f"    {f:<10} CI가 0을 포함 → v0 {v0[f]:+.3f} 유지")

    print("\n  [백테스팅] 주거화재 포집률 @Top10% (인샘플 — 상대 비교용)")
    for label, betas in (
        ("v0 (β_age=0.5)", Betas()),
        ("LTR 채택안", Betas(age=adopt["x1_age"], struct=adopt["x2_struct"], prior=adopt["x3_prior"])),
    ):
        r = relative_risk(labeled, betas=betas, as_of=AS_OF)
        raw = raw_score(labeled["lambda_hat"], labeled["area_mult"], r["rr_i"])
        s, _, _ = normalize_score(raw)
        tmp = labeled.assign(_s=s.values)
        cr = capture_rate(tmp, "_s", "fire_label")
        print(f"    {label:<18} {cr:>5.1f}%")

    print("\n  [결론] " + ("v0 β 유지 — LTR 학습값 미채택" if confounded else "LTR 채택안 적용"))
    print("\n  ⚠️ 위 포집률은 **인샘플**이다(λ̂를 만든 화재가 라벨에 포함됨).")
    print("     시간 분할 백테스팅(학습 2019~2022 → 2023 홀드아웃)은 119신고 다년 이력을")
    print("     건물 단위로 귀속시켜야 성립하는데, 신고 좌표 충전율이 58~78%라 미착수로 남긴다.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except DataTrapError as exc:
        print(f"\n[함정 감지 — 중단]\n{exc}", file=sys.stderr)
        sys.exit(2)
