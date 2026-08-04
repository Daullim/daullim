#!/usr/bin/env python
"""seed 산출 — buildings.csv · units.csv · grids.geojson 동시 생성.

    ./.venv/bin/python -u run_seed.py
"""

from __future__ import annotations

import json
import sys

import geopandas as gpd
import pandas as pd

from daullim_data.apiclient import (
    EAIS_CACHE,
    EXPOS_CACHE,
    GEOCODE_CACHE,
    ApiClient,
    JsonlCache,
)
from daullim_data.buildings import build_master, fetch_expos, fetch_titles, geocode
from daullim_data.regions import REGIONS, region
from daullim_data.scoring import assign_order, basis_text, rx_code
from daullim_data.seed_out import (
    build_buildings_csv,
    build_grid_geojson,
    build_regions_csv,
    build_units_csv,
    validate_seed,
    write_seed,
)
from daullim_data.utils import (
    DATA_ROOT,
    SEED_ROOT,
    CRS_STORAGE,
    DataTrapError,
    coord_to_grid500,
    glob_kr,
    grid500_to_1km,
)
from run_scoring import SCORE_VERSION, build_scored


def load_units() -> pd.DataFrame:
    """건물 마스터와 같은 경로로 units를 다시 만든다(캐시라 API 호출 0)."""
    tc = ApiClient(JsonlCache(EAIS_CACHE))
    ec = ApiClient(JsonlCache(EXPOS_CACHE))
    gc = ApiClient(JsonlCache(GEOCODE_CACHE))
    frames = []
    for key in REGIONS:
        titles = fetch_titles(key, client=tc)
        _b, u, _rep = build_master(
            key, titles=titles,
            geocoder=lambda a, kind="road": geocode(a, kind=kind, client=gc),
            expos_fetcher=lambda r: fetch_expos(r, client=ec),
        )
        frames.append(u)
    return pd.concat(frames, ignore_index=True)


def load_region_names() -> dict[str, tuple[str, str, str]]:
    """지오코딩 캐시 → `admin_dong_cd` → (시도명, 시군구명, 행정동명).

    VWorld 도로명 검색 응답에 `level1`·`level2`·`level4A`가 코드(`level4AC`)와 함께 온다.
    `buildings`에는 명칭 컬럼이 없으므로 이 캐시가 유일한 원천이며, 이미 받아 둔 것이라
    추가 호출이 0이다.
    """
    cache = JsonlCache(GEOCODE_CACHE)
    out: dict[str, tuple[str, str, str]] = {}
    for key in cache._data:
        try:
            st = cache.get(key)["response"]["refined"]["structure"]
        except (KeyError, TypeError):
            continue
        code = st.get("level4AC")
        sido, sigungu, dong = st.get("level1"), st.get("level2"), st.get("level4A")
        if code and sido and sigungu and dong:
            out.setdefault(str(code), (sido, sigungu, dong))
    return out


def load_boundaries(grid_ids: set[str]) -> dict[str, list]:
    """SGIS 경계 SHP → 필요한 격자만 EPSG:4326 링 좌표로.

    시연 격자만 남긴다(ADR-008 §9 클리핑) — 전국 경계를 다 실으면 파일이 수백 MB가 된다.
    """
    zones = {g[:2] for g in grid_ids}
    out: dict[str, list] = {}
    for zone in zones:
        for shp in glob_kr(DATA_ROOT / "sgis" / "2. 경계", f"grid_{zone}_1K.shp"):
            gdf = gpd.read_file(shp)
            gdf = gdf.loc[gdf["GRID_CD"].isin(grid_ids)].to_crs(CRS_STORAGE)
            for row in gdf.itertuples():
                geom = row.geometry
                if geom is None or geom.is_empty:
                    continue
                poly = geom if geom.geom_type == "Polygon" else max(geom.geoms, key=lambda g: g.area)
                out[row.GRID_CD] = [list(c) for c in poly.exterior.coords]
    return out


def main() -> int:
    print("=" * 72)
    print("seed 산출 — buildings.csv · units.csv · grids.geojson")
    print("=" * 72)

    scored, params = build_scored()
    ordered, rep = assign_order(scored)
    ordered["basis"] = basis_text(ordered["order_key"]).values
    ordered["rx_code_cd"] = rx_code(len(ordered)).values
    ordered["score_version"] = SCORE_VERSION
    ordered["computed_at"] = pd.Timestamp.now(tz="Asia/Seoul").isoformat(timespec="seconds")
    ordered["lambda_i"] = ordered["lambda_hat"]
    # region_type_cd는 **저장값 4분류**다(BUFFER 보존) — algo_class(2분류)와 다른 축이다.
    ordered["region_type_cd"] = ordered["region_type_cd"].fillna("URBAN")
    ordered["grid_id"] = [
        coord_to_grid500(la, ln, region(k).zone[0])
        for la, ln, k in zip(ordered["lat"], ordered["lng"], ordered["region_key"])
    ]

    buildings = build_buildings_csv(ordered)
    units = build_units_csv(load_units(), keep_keys=set(buildings["bld_key"]))
    regions = build_regions_csv(buildings, names=load_region_names())
    print(f"  buildings {len(buildings):,}행 · units {len(units):,}행 · regions {len(regions):,}행")

    # 격자 GeoJSON — 건물이 있는 격자만
    per_grid = (
        ordered.groupby("grid1k")
        .agg(buildings=("bld_key", "size"), avg_score=("score", "mean"),
             region_type_cd=("region_type_cd", "first"), households=("exposure", "max"),
             risk_level_cd=("risk_level_cd", lambda s: s.mode().iat[0]))
        .reset_index()
    )
    bounds = load_boundaries(set(per_grid["grid1k"]))
    geojson = build_grid_geojson(per_grid, boundaries=bounds)
    print(f"  격자 {len(per_grid):,}개 중 경계 확보 {len(geojson['features']):,}개")

    errs = validate_seed(buildings, units, geojson, regions)
    if errs:
        print("\n  [seed 검증 실패]")
        for e in errs:
            print(f"    · {e}")
        return 1

    written = write_seed(SEED_ROOT, buildings, units, geojson, regions)
    (SEED_ROOT / "score_params.json").write_text(
        json.dumps(params.to_dict(), ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print("\n  [seed 검증 통과]")
    for p in written:
        print(f"    {p.relative_to(SEED_ROOT.parent)} — {p.stat().st_size / 1024:,.0f} KB")
    print(f"    seed/score_params.json — {params.version}")

    print("\n  [구성]")
    print("    유형: " + " · ".join(f"{k} {v:,}" for k, v in buildings["house_type_cd"].value_counts().items()))
    print("    위험: " + " · ".join(f"{k} {v:,}" for k, v in buildings["risk_level_cd"].value_counts().items()))
    print("    지역: " + " · ".join(f"{k} {v:,}" for k, v in buildings["region_type_cd"].value_counts().items()))
    print("    호수 출처: " + " · ".join(f"{k} {v:,}" for k, v in units["ho_nm_source_cd"].value_counts().items()))
    print("    지역 사전: " + " · ".join(
        f"{k} {v}" for k, v in regions["level"].value_counts().reindex(["sido", "sigungu", "dong"]).items()))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except DataTrapError as exc:
        print(f"\n[함정 감지 — 중단]\n{exc}", file=sys.stderr)
        sys.exit(2)
