#!/usr/bin/env python
"""커널 강도 λ̂ 실행 로그 — EB 축소 m 추정 · 격자 내 동점 소멸 · m 민감도.

    ./.venv/bin/python run_kernel.py [--sido 서울 부산 전북]
"""

from __future__ import annotations

import argparse
import sys

import numpy as np
import pandas as pd

from daullim_data.ingest import load_fires
from daullim_data.kernel import (
    BANDWIDTH_M,
    estimate_m,
    jaccard,
    lambda_hat,
    prepare_fires,
    spread_exposure,
    top_share,
)
from daullim_data.region_type import RURAL, URBAN
from daullim_data.utils import DataTrapError, grid1k_centroid, to_5179
from run_region_type import build

REFERENCE_DAY = pd.Timestamp("2023-12-31")  # 2023 단년 데이터의 관측 종료 시점
LATTICE_STEP_M = 100  # 격자 내 동점 소멸 데모용 격자간격
DEMO_GRIDS = 20


def _with_xy(grids: pd.DataFrame) -> pd.DataFrame:
    xy = [grid1k_centroid(g) for g in grids["grid1k"]]
    out = grids.copy()
    out["x_5179"] = [p[0] for p in xy]
    out["y_5179"] = [p[1] for p in xy]
    return out


def _fire_points(sido: str) -> pd.DataFrame:
    fires, _ = load_fires(sido)
    f = fires.dropna(subset=["LAT", "LOT"]).copy()
    xy = [to_5179(float(a), float(b)) for a, b in zip(f["LAT"], f["LOT"])]
    f["x_5179"] = [p[0] for p in xy]
    f["y_5179"] = [p[1] for p in xy]
    return f


def _lattice(grids: pd.DataFrame, step: int = LATTICE_STEP_M) -> pd.DataFrame:
    """격자 내부를 step 간격으로 채운 점들 — 동점 소멸 검증용."""
    offs = np.arange(step / 2, 1000, step) - 500
    ox, oy = np.meshgrid(offs, offs)
    ox, oy = ox.ravel(), oy.ravel()
    rows = []
    for r in grids.itertuples():
        rows.append(
            pd.DataFrame(
                {
                    "grid1k": r.grid1k,
                    "x_5179": r.x_5179 + ox,
                    "y_5179": r.y_5179 + oy,
                    "algo_class": r.algo_class,
                }
            )
        )
    return pd.concat(rows, ignore_index=True)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sido", nargs="*", default=["서울", "부산", "전북"])
    args = ap.parse_args()

    for sido in args.sido:
        print("=" * 72)
        print(f"커널 강도 λ̂ — {sido}  (b={BANDWIDTH_M:.0f}m · τ=3년 · w_sev 3/2/1)")
        print("=" * 72)

        grids = _with_xy(build(sido))
        fires = _fire_points(sido)
        sources = prepare_fires(fires, reference_day=REFERENCE_DAY)

        # ── m 모멘트 추정: 도농 클래스별, w_sev 없는 순수 사건 수로 ──
        # 분자와 **같은 사건 집합**(주거 화재)을 써야 한다. 분자는 주거만 보는데
        # m을 전체 화재로 추정하면 두 항의 기준이 어긋난다.
        cells = grids.loc[grids["households"].fillna(0) > 0].copy()
        cells["raw_fires"] = cells["residential_fires"].fillna(0)
        estimates = {}
        print("  [EB 축소 m — Clayton–Kaldor 모멘트 추정, 순수 사건 수 기준]")
        for cls in (URBAN, RURAL):
            sub = cells.loc[cells["algo_class"] == cls]
            if len(sub) < 2:
                print(f"    {cls:<6} 유효 셀 부족 — 건너뜀")
                continue
            est = estimate_m(sub["raw_fires"], sub["households"])
            estimates[cls] = est
            print(f"    {cls:<6} {est.render()}")
        if not estimates:
            print("  (추정 불가 — 다음 시도로)")
            continue

        # ── 격자 내 동점 소멸 ──
        demo = grids.loc[grids["fires"].fillna(0) > 0].nlargest(DEMO_GRIDS, "fires")
        pts = _lattice(demo)
        exposure = spread_exposure(
            grids.loc[grids["households"].fillna(0) > 0, ["x_5179", "y_5179", "households"]]
        )
        parts = []
        for cls, est in estimates.items():
            p = pts.loc[pts["algo_class"] == cls]
            if p.empty:
                continue
            parts.append(lambda_hat(p, sources, exposure, m=est.m, lambda_bar=est.lambda_bar))
        scored = pd.concat(parts, ignore_index=True) if parts else pd.DataFrame()

        print(f"  [격자 내 동점 소멸] 상위 {len(demo)}개 격자 × {LATTICE_STEP_M}m 격자점")
        if scored.empty:
            print("    (해당 클래스 점 없음)")
        else:
            g = scored.groupby("grid1k")["lambda_hat"]
            uniq = g.nunique()
            size = g.size()
            spread = (g.max() / g.min().replace(0, np.nan)).dropna()
            print(f"    점 {len(scored):,}개 · 격자당 고유 λ̂ {uniq.sum():,}/{size.sum():,} "
                  f"({100 * uniq.sum() / size.sum():.1f}%)")
            print(f"    격자 내 최대/최소 비율 중앙값 {spread.median():.1f}배 "
                  f"(격자 전용 모델이면 1.0배 = 완전 동점)")

            # ── m 민감도: 튜닝이 아니라 보고 ──
            base = top_share(scored.set_index(scored.index))
            print("  [m 민감도] 상위 10% 집합의 자카드 유사도 — 순위 안정성 보고")
            for mult in (0.5, 2.0):
                alt = []
                for cls, est in estimates.items():
                    p = pts.loc[pts["algo_class"] == cls]
                    if p.empty:
                        continue
                    alt.append(
                        lambda_hat(p, sources, exposure, m=est.m * mult, lambda_bar=est.lambda_bar)
                    )
                a = pd.concat(alt, ignore_index=True)
                print(f"    m×{mult:<4} → Jaccard {jaccard(base, top_share(a)):.3f}")
        print()
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except DataTrapError as exc:
        print(f"\n[함정 감지 — 중단]\n{exc}", file=sys.stderr)
        sys.exit(2)
