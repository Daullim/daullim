#!/usr/bin/env python
"""도농 판별 실행 로그 + v0 성적표.

    ./.venv/bin/python run_region_type.py

성적표 두 지표가 미달이면 판별 구현이 틀린 것이므로 다음 커밋으로 넘어가지 않는다.
"""

from __future__ import annotations

import sys

import pandas as pd

from daullim_data.ingest import load_fires, load_sgis_grid
from daullim_data.region_type import (
    agreement,
    classify,
    dispatch_monotonicity,
    is_monotonic,
    promote_no_pop,
)
from daullim_data.utils import ZONE_PREFIX, DataTrapError

SIDOS = ("서울", "부산", "전북")


def build(sido: str) -> pd.DataFrame:
    """SGIS 격자 통계 + 화재 이력 격자 데이터 → 판별된 격자 테이블."""
    fires, _ = load_fires(sido)
    grids = load_sgis_grid(ZONE_PREFIX[sido])

    per_grid = fires.groupby("grid1k").agg(
        dispatch_sec=("DSPT_REQ_HR", "median"),
        fires=("GRID_ID", "size"),
        residential_fires=("is_residential", "sum"),
        deaths=("DCSD_CNT", "sum"),
        # 농촌 가구 정렬키 3순위 — 소방서-현장 거리(km). 건물 단위 값이 없어 격자 중앙값으로 근사한다.
        fire_distance=("FRSTN_GRNDS_DSTNC", "median"),
    )
    # 격자당 플랫폼 라벨은 최빈값 — 한 격자에 여러 화재가 있을 수 있다.
    label = fires.groupby("grid1k")["CTY_FRMVL_SE_NM"].agg(
        lambda s: s.mode().iat[0] if not s.mode().empty else None
    )

    # 화재가 있었는데 SGIS 격자 통계에 없는 셀도 살려야 한다(무인구 = NO_POP 후보).
    merged = grids.merge(per_grid, left_on="grid1k", right_index=True, how="outer")
    merged["grid1k"] = merged["grid1k"].fillna(pd.Series(merged.index, index=merged.index))
    merged["pop"] = merged["pop"].fillna(0)
    merged["platform_label"] = merged["grid1k"].map(label)

    out = classify(merged)
    return promote_no_pop(out, per_grid["residential_fires"])


def main() -> int:
    frames = []
    for sido in SIDOS:
        g = build(sido)
        g["sido"] = sido
        frames.append(g)
        dist = g["region_type_cd"].value_counts()
        total = int(dist.sum())
        print(f"■ {sido} — 격자 {total:,}개")
        print("    " + " · ".join(f"{k} {v:,}({100 * v / total:.1f}%)" for k, v in dist.items()))
        print(f"    MIXED 플래그 {int(g['is_mixed'].sum()):,} · "
              f"NO_POP 승격(주거화재>0) {int(g['no_pop_promoted'].sum()):,}")
    pooled = pd.concat(frames, ignore_index=True)

    # 성적표는 3개 시도 합산 — 대조 규약이 그렇고, 서울은 읍·면 없어 시도별 RURAL 표본 불성립
    print()
    print("=" * 72)
    print("v0 성적표 (§7) — 3개 시도 합산")
    print("=" * 72)
    failures: list[str] = []

    rep = agreement(pooled)
    print(rep.render())
    if not rep.passed():
        failures.append(f"라벨 일치도 URBAN {rep.urban_pct:.1f}% / RURAL {rep.rural_pct:.1f}%")

    mono = dispatch_monotonicity(pooled)
    print("  [출동소요 단조성] 분류가 골든타임 7분 도달권을 실제로 가르는가")
    for cls, row in mono.iterrows():
        print(f"    {cls:<7} 중앙 {row['median_min']:>5.1f}분 · 평균 {row['mean_min']:>5.1f}분  (n={int(row['n']):,})")
    ok = is_monotonic(mono)
    print(f"    → 단조 증가 {'통과' if ok else '미달'}  (정의서 인용 5.9 → 8.3 → 12.4 → 13.5분)")
    if not ok:
        failures.append("출동소요 단조성 미달")

    print("=" * 72)
    if failures:
        print("v0 성적표 미달 — 다음 커밋으로 넘어가지 않는다:")
        for f in failures:
            print(f"  · {f}")
        return 1
    print("v0 성적표 통과")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except DataTrapError as exc:
        print(f"\n[함정 감지 — 중단]\n{exc}", file=sys.stderr)
        sys.exit(2)
