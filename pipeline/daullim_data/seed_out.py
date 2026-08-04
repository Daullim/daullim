"""seed 산출 — `buildings.csv` · `units.csv` · GeoJSON을 **한 실행에서 동시 생성**.

ADR-008 §9 산출 원자성: 중간에 실패하면 '버전이 어긋난 CSV와 GeoJSON'이 남는 게 가장
위험하다. 임시 파일에 전부 쓴 뒤 마지막에 일괄 rename한다(`write_outputs_atomic`).

DDL 계약을 그대로 따른다 — `building_id`(bigserial)와 `address_norm`(GENERATED)은
파이프라인이 채우지 않는다. `units`는 ADR-015의 **정적 4컬럼만** 낸다.
"""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from .utils import GEOJSON_COORD_NDIGITS, round_coords, write_csv_kr, write_outputs_atomic

# DDL 순서 그대로. `building_id`·`address_norm`·`created_at`·`updated_at`은 DB가 채운다.
BUILDING_COLUMNS = [
    "bld_key", "sido_cd", "sigungu_cd", "admin_dong_cd", "address", "lat", "lng",
    "house_type_cd", "floor_count", "unit_count", "use_apr_day",
    "install_day", "install_year", "detector_model", "grid_id", "region_type_cd",
    "lambda_i", "rr_i", "score", "risk_level_cd", "order_key",
    "is_explore", "is_estimated", "basis", "rx_code_cd", "score_version", "computed_at",
]
# `units`는 정적 4컬럼 + 조인키. `building_id`는 적재 시 `bld_key`로 해석한다(ADR-015).
UNIT_COLUMNS = ["bld_key", "unit_seq", "ho_nm", "flr_no", "ho_nm_source_cd"]


def build_buildings_csv(scored: pd.DataFrame) -> pd.DataFrame:
    """점수까지 끝난 프레임 → DDL 컬럼만 남긴 적재용 표."""
    out = pd.DataFrame(index=scored.index)
    for col in BUILDING_COLUMNS:
        out[col] = scored[col] if col in scored.columns else None
    # DDL 타입에 맞춘 정리 — bool은 소문자, 정수는 소수점 없이
    for col in ("is_explore", "is_estimated"):
        out[col] = out[col].fillna(False).astype(bool)
    for col in ("floor_count", "unit_count", "order_key"):
        out[col] = out[col].astype("int64")
    out["install_year"] = out["install_year"].astype("Int64")
    out["lat"] = out["lat"].astype(float).round(6)
    out["lng"] = out["lng"].astype(float).round(6)
    for col in ("lambda_i", "rr_i"):
        out[col] = out[col].astype(float).round(6)
    out["score"] = out["score"].astype(float).round(2)
    return out


def build_units_csv(units: pd.DataFrame, *, keep_keys: set[str]) -> pd.DataFrame:
    """`units` 정적 4컬럼. 적재되지 못한 건물의 세대는 함께 버린다(FK 무결성)."""
    out = units.loc[units["bld_key"].isin(keep_keys), UNIT_COLUMNS].copy()
    out["unit_seq"] = out["unit_seq"].astype("int64")
    out["flr_no"] = out["flr_no"].astype("Int64")
    return out


def build_grid_geojson(grids: pd.DataFrame, *, boundaries: dict[str, list]) -> dict:
    """격자 폴리곤 FeatureCollection.

    좌표는 5자리 반올림(ADR-008 §9) — 파일 크기와 git diff 안정성 둘 다를 위해서다.
    격자 단위 속성의 정본은 DB가 아니라 이 파일이다(ADR-012 결정 23).
    """
    features = []
    for row in grids.itertuples():
        ring = boundaries.get(row.grid1k)
        if not ring:
            continue
        features.append({
            "type": "Feature",
            "geometry": {"type": "Polygon", "coordinates": round_coords([ring])},
            "properties": {
                "grid_id": row.grid1k,
                "region_type_cd": row.region_type_cd,
                "households": int(row.households) if pd.notna(row.households) else 0,
                "buildings": int(row.buildings),
                "avg_score": round(float(row.avg_score), 1),
                "risk_level_cd": row.risk_level_cd,
            },
        })
    return {"type": "FeatureCollection", "features": features}


def write_seed(
    seed_root: Path, buildings: pd.DataFrame, units: pd.DataFrame, geojson: dict
) -> list[Path]:
    """세 산출물을 원자적으로 낸다 — 하나라도 실패하면 기존 파일이 그대로 남는다."""
    return write_outputs_atomic({
        seed_root / "buildings.csv": lambda p: write_csv_kr(buildings, p),
        seed_root / "units.csv": lambda p: write_csv_kr(units, p),
        seed_root / "grids.geojson": lambda p: p.write_text(
            json.dumps(geojson, ensure_ascii=False), encoding="utf-8"
        ),
    })


def validate_seed(buildings: pd.DataFrame, units: pd.DataFrame, geojson: dict) -> list[str]:
    """ADR-009 seed 산출 검증 — 적재 전에 여기서 막는다."""
    errs: list[str] = []
    if buildings.empty:
        return ["buildings.csv가 비었다"]

    for col in ("bld_key", "sido_cd", "sigungu_cd", "admin_dong_cd", "address", "lat", "lng",
                "house_type_cd", "floor_count", "unit_count", "region_type_cd",
                "score", "risk_level_cd", "order_key", "score_version", "computed_at"):
        n = int(buildings[col].isna().sum())
        if n:
            errs.append(f"NOT NULL 위반 {col}: {n}행")

    if buildings["bld_key"].duplicated().any():
        errs.append("bld_key 중복")
    if sorted(buildings["order_key"]) != list(range(1, len(buildings) + 1)):
        errs.append("order_key 유일·연속 위반")
    if not buildings["score"].between(0, 100).all():
        errs.append("score 0~100 위반")
    if not buildings["lat"].between(33, 39).all() or not buildings["lng"].between(124, 132).all():
        errs.append("좌표 CHECK 위반")
    if not set(buildings["region_type_cd"]) <= {"URBAN", "RURAL", "BUFFER", "NO_POP"}:
        errs.append("region_type_cd 허용값 위반")

    quota = buildings["is_explore"].mean()
    if not 0.05 <= quota <= 0.10:
        errs.append(f"탐사 쿼터 {100 * quota:.1f}% — 5~10% 밖")

    orphan = set(units["bld_key"]) - set(buildings["bld_key"])
    if orphan:
        errs.append(f"units에 고아 bld_key {len(orphan)}건")
    if len(units) != int(buildings["unit_count"].sum()):
        errs.append(f"units {len(units):,} ≠ Σunit_count {int(buildings['unit_count'].sum()):,}")
    if units.duplicated(["bld_key", "unit_seq"]).any():
        errs.append("units (bld_key, unit_seq) 중복")

    if not geojson.get("features"):
        errs.append("GeoJSON에 feature가 없다")
    return errs
