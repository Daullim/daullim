#!/usr/bin/env python
"""원본 적재·검증 실행 로그 — 발표 자산(§9 산출물 5).

    ./.venv/bin/python run_ingest.py [--with-calls]

`--with-calls`는 119신고 5년치(약 4.2GB)를 훑어 연도 정규화와
'활동 있는 침묵' 격자를 낸다. 몇 분 걸린다.
"""

from __future__ import annotations

import argparse
import sys

from daullim_data.ingest import (
    load_call_counts,
    load_fires,
    silent_activity,
    year_share,
    yearly_totals,
)
from daullim_data.utils import DataTrapError, coord_to_grid500

SIDOS = ("서울", "부산", "전북")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--with-calls", action="store_true", help="119신고 5년치까지 집계")
    ap.add_argument("--sido", nargs="*", default=list(SIDOS))
    args = ap.parse_args()

    print("=" * 72)
    print("STEP 1 — 화재발생 건별 격자 정보 적재·검증")
    print("=" * 72)
    for sido in args.sido:
        df, report = load_fires(sido)
        print(report.render())

        # §4-5 두 경로 자체 대조: 좌표 변환 ↔ 격자 코드 문자열
        sub = df.dropna(subset=["LAT", "LOT"])
        derived = [
            coord_to_grid500(float(la), float(lo), str(g)[:2])
            for la, lo, g in zip(sub["LAT"], sub["LOT"], sub["GRID_ID"])
        ]
        hit = sum(1 for a, b in zip(derived, sub["GRID_ID"]) if a == str(b).strip())
        print(f"  · 좌표↔코드 자체 대조: {hit:,}/{len(sub):,} = {100 * hit / len(sub):.2f}%")
        print()

    if not args.with_calls:
        print("(119신고 집계는 --with-calls 로 실행)")
        return 0

    print("=" * 72)
    print("STEP 2 — 119신고 연도 정규화 + '활동 있는 침묵' 격자")
    print("=" * 72)
    for sido in args.sido:
        counts, creport = load_call_counts(sido)
        print(creport.render())
        totals, share = yearly_totals(counts), year_share(counts)
        for y in sorted(totals):
            print(f"    {y}  {int(totals[y]):>10,}건   비중 {share[y]:.3f}")
        silent = silent_activity(counts)
        print(f"  · '활동 있는 침묵' 격자: {len(silent):,}개 (총신고 50+ / 화재신고 0)")
        if len(silent):
            top = silent.head(3)
            print(
                "    상위: "
                + " · ".join(f"{r.grid1k}({int(r.total):,}건)" for r in top.itertuples())
            )
        print()
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except DataTrapError as exc:  # fail-fast를 그대로 보여준다
        print(f"\n[함정 감지 — 중단]\n{exc}", file=sys.stderr)
        sys.exit(2)
