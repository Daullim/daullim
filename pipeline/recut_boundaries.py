#!/usr/bin/env python
"""행정동 경계 GeoJSON 재절단 — `run_seed.py`가 만들지 않는 유일한 산출물.

    ./.venv/bin/python recut_boundaries.py --source <admdongkor.geojson>

**시연 지역을 늘리면 이 파일만 조용히 뒤처진다.** 나머지 seed는 전부 재산출되는데 이건
외부 원본(admdongkor)을 손으로 잘라 온 것이라 자동으로 따라오지 않는다. 그리고 빠져도
**큐·목록은 멀쩡하고 지도만 빈다** — 눈으로는 늦게 발견된다. 그래서 스크립트로 세운다.

원본은 리포에 두지 않는다(33MB). 필요할 때 받아서 경로로 넘긴다:
  https://github.com/vuski/admdongkor `ver20250701`

사본 3벌(`seed/`·`backend/src/main/resources/`·`frontend/public/`)까지 한 번에 맞춘다 —
한 곳만 고치면 화면과 서버가 다른 데이터를 본다(README § 사본 동기화).
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

from daullim_data.regions import REGIONS
from daullim_data.utils import REPO_ROOT, DataTrapError

SOURCE_TAG = "admdongkor-ver20250701"
OUT_NAME = "admin-dong-boundaries.geojson"
COPIES = (
    REPO_ROOT / "backend" / "src" / "main" / "resources" / OUT_NAME,
    REPO_ROOT / "frontend" / "public" / OUT_NAME,
)


def cut(source: Path) -> dict:
    """시연 시군구(`REGIONS`의 `mois`)에 속한 행정동만 남기고 속성을 정규화한다."""
    raw = json.loads(source.read_text(encoding="utf-8"))
    wanted = {r.mois: r.name for r in REGIONS.values()}

    features = []
    for f in raw["features"]:
        p = f["properties"]
        # adm_cd2가 10자리 행정동코드다. 앞 5자리가 시군구 — 접두사 관계는 실측 확인됨.
        dong_cd = str(p.get("adm_cd2") or "")
        if len(dong_cd) != 10 or dong_cd[:5] not in wanted:
            continue
        features.append({
            "type": "Feature",
            "properties": {
                "dong_cd": dong_cd,
                # adm_nm은 "서울특별시 강북구 미아동" 형식 — 마지막 토큰이 동명이다.
                "dong_nm": str(p.get("adm_nm") or "").split()[-1],
                "sigungu_cd": dong_cd[:5],
                "source": SOURCE_TAG,
            },
            "geometry": f["geometry"],
        })

    missing = set(wanted) - {f["properties"]["sigungu_cd"] for f in features}
    if missing:
        raise DataTrapError(
            "원본에 없는 시군구: " + ", ".join(f"{c}({wanted[c]})" for c in sorted(missing))
            + "\n  원본 버전이 시연 지역보다 오래됐을 수 있다."
        )
    return {"type": "FeatureCollection", "features": features}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True, type=Path, help="admdongkor 전국 GeoJSON")
    args = ap.parse_args()

    if not args.source.exists():
        raise DataTrapError(f"원본 없음: {args.source}")

    fc = cut(args.source)
    per_sgg: dict[str, int] = {}
    for f in fc["features"]:
        per_sgg[f["properties"]["sigungu_cd"]] = per_sgg.get(f["properties"]["sigungu_cd"], 0) + 1

    out = REPO_ROOT / "seed" / OUT_NAME
    out.write_text(json.dumps(fc, ensure_ascii=False), encoding="utf-8")
    print(f"  {out.relative_to(REPO_ROOT)} — {len(fc['features'])}개 행정동 · "
          f"{out.stat().st_size / 1024:,.0f} KB")
    for cd, n in sorted(per_sgg.items()):
        print(f"    {cd} {REGIONS[next(k for k, r in REGIONS.items() if r.mois == cd)].name}: {n}개")

    for dest in COPIES:
        shutil.copyfile(out, dest)
        print(f"  사본 → {dest.relative_to(REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except DataTrapError as exc:
        print(f"\n[함정 감지 — 중단]\n{exc}", file=sys.stderr)
        sys.exit(2)
