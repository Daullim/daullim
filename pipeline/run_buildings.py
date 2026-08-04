#!/usr/bin/env python
"""건물 마스터 + 세대 생성 실행 로그 — 표제부 수집·지오코딩·DDL 검증.

    ./.venv/bin/python run_buildings.py [--region gwanak imsil]

호출은 전부 캐시를 경유한다(`data/eais/`·`data/geocode_cache/`).
중간에 끊겨도 다시 돌리면 이미 받은 것은 재호출하지 않는다.
"""

from __future__ import annotations

import argparse
import sys

import pandas as pd

from daullim_data.apiclient import (
    EAIS_CACHE,
    EXPOS_CACHE,
    GEOCODE_CACHE,
    ApiClient,
    JsonlCache,
)
from daullim_data.buildings import (
    DETACHED,
    MULTI_FAMILY,
    MULTI_UNIT,
    MULTI_USER,
    ROW_HOUSE,
    build_master,
    fetch_expos,
    fetch_titles,
    geocode,
)
from daullim_data.regions import REGIONS
from daullim_data.utils import DataTrapError

HOUSE_TYPES = {DETACHED, MULTI_USER, MULTI_FAMILY, ROW_HOUSE, MULTI_UNIT}
SOURCE_CODES = {"expos", "field", "implicit"}


def validate(buildings: pd.DataFrame, units: pd.DataFrame) -> list[str]:
    """DDL의 NOT NULL·CHECK를 그대로 재현한다. 적재 전에 여기서 걸러야 한다."""
    errs: list[str] = []
    if buildings.empty:
        return ["buildings가 비었다"]

    for col in ("bld_key", "sido_cd", "sigungu_cd", "admin_dong_cd", "address",
                "lat", "lng", "house_type_cd", "floor_count", "unit_count"):
        n = int(buildings[col].isna().sum())
        if n:
            errs.append(f"NOT NULL 위반 {col}: {n}행")

    if buildings["bld_key"].duplicated().any():
        errs.append(f"bld_key 중복 {int(buildings['bld_key'].duplicated().sum())}건")
    if not buildings["lat"].between(33, 39).all():
        errs.append("ck_bld_lat 위반 (33~39 밖)")
    if not buildings["lng"].between(124, 132).all():
        errs.append("ck_bld_lng 위반 (124~132 밖)")
    if not (buildings["floor_count"] > 0).all():
        errs.append("ck_bld_floor 위반")
    if not (buildings["unit_count"] > 0).all():
        errs.append("ck_bld_unit 위반")
    bad_type = set(buildings["house_type_cd"]) - HOUSE_TYPES
    if bad_type:
        errs.append(f"ck_bld_house 위반: {bad_type}")
    apr = buildings["use_apr_day"].dropna()
    if not apr.astype(str).str.fullmatch(r"\d{8}").all():
        errs.append("ck_bld_apr 위반 (YYYYMMDD 아님)")

    if not units.empty:
        bad_src = set(units["ho_nm_source_cd"]) - SOURCE_CODES
        if bad_src:
            errs.append(f"ck_units_source 위반: {bad_src}")
        if not (units["unit_seq"] > 0).all():
            errs.append("ck_units_seq 위반")
        if units.duplicated(["bld_key", "unit_seq"]).any():
            errs.append("uq_units_bld_seq 위반 (건물 내 unit_seq 중복)")
        named = units.dropna(subset=["ho_nm"])
        if named.duplicated(["bld_key", "ho_nm"]).any():
            errs.append("ux_units_bld_ho 위반 (건물 내 호수 중복)")

    total = int(buildings["unit_count"].sum())
    if len(units) != total:
        errs.append(f"units 행수 {len(units):,} ≠ Σunit_count {total:,}")
    return errs


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--region", nargs="*", default=list(REGIONS))
    args = ap.parse_args()

    # 캐시를 공유해 재호출을 막는다 — 한도가 유한한 자원이다.
    title_client = ApiClient(JsonlCache(EAIS_CACHE))
    expos_client = ApiClient(JsonlCache(EXPOS_CACHE))
    geo_client = ApiClient(JsonlCache(GEOCODE_CACHE))

    all_b, all_u, failures = [], [], []
    for key in args.region:
        print("=" * 72)
        print(f"건물 마스터 — {REGIONS[key].name}")
        print("=" * 72)
        titles = fetch_titles(key, client=title_client)
        print(f"  표제부 수집 {len(titles):,}건 "
              f"(API {title_client.calls:,}회 · 캐시 {title_client.hits:,}회)")

        buildings, units, rep = build_master(
            key,
            titles=titles,
            geocoder=lambda a, kind="road": geocode(a, kind=kind, client=geo_client),
            expos_fetcher=lambda r: fetch_expos(r, client=expos_client),
        )
        print(rep.render())
        print(f"  지오코딩 API {geo_client.calls:,}회 · 캐시 {geo_client.hits:,}회 "
              f"| 전유부 API {expos_client.calls:,}회 · 캐시 {expos_client.hits:,}회")

        errs = validate(buildings, units)
        if errs:
            failures += [f"{key}: {e}" for e in errs]
            print("  [DDL 검증 실패]")
            for e in errs:
                print(f"    · {e}")
        else:
            print(f"  [DDL 검증 통과] buildings {len(buildings):,}행 · units {len(units):,}행")
        all_b.append(buildings)
        all_u.append(units)
        print()

    b = pd.concat(all_b, ignore_index=True)
    u = pd.concat(all_u, ignore_index=True)
    print("=" * 72)
    print(f"합계 buildings {len(b):,}행 · units {len(u):,}행")
    print("  유형: " + " · ".join(
        f"{k} {v:,}" for k, v in b["house_type_cd"].value_counts().items()))
    print("  호수 출처: " + " · ".join(
        f"{k} {v:,}" for k, v in u["ho_nm_source_cd"].value_counts().items()))
    print(f"  사용승인일 결측 {int(b['use_apr_day'].isna().sum()):,}행 "
          f"({100 * b['use_apr_day'].isna().mean():.1f}%)")
    print(f"  지오코딩 추정(is_estimated) {int(b['is_estimated'].sum()):,}행")

    if failures:
        print("\nDDL 검증 미달 — 적재 불가:")
        for f in failures:
            print(f"  · {f}")
        return 1
    print("\nDDL 검증 전량 통과")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except DataTrapError as exc:
        print(f"\n[함정 감지 — 중단]\n{exc}", file=sys.stderr)
        sys.exit(2)
