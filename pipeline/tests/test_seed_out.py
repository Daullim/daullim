"""seed 산출 — DDL 계약과 원자성을 잠근다."""

from __future__ import annotations

import json

import pandas as pd
import pytest

from daullim_data.seed_out import (
    BUILDING_COLUMNS,
    REGION_COLUMNS,
    build_regions_csv,
    UNIT_COLUMNS,
    build_buildings_csv,
    build_grid_geojson,
    build_units_csv,
    validate_seed,
    write_seed,
)


def _scored(n=3):
    return pd.DataFrame({
        "bld_key": [f"K{i}" for i in range(n)],
        "sido_cd": ["11"] * n, "sigungu_cd": ["11620"] * n, "admin_dong_cd": ["1162069500"] * n,
        "address": ["서울특별시 관악구 봉천로 1"] * n,
        "lat": [37.4784567] * n, "lng": [126.9516789] * n,
        "house_type_cd": ["detached"] * n, "floor_count": [2] * n, "unit_count": [1] * n,
        "use_apr_day": ["20010101"] * n,
        "install_day": [None] * n, "install_year": [None] * n, "detector_model": [None] * n,
        "grid_id": ["다사46a41a"] * n, "region_type_cd": ["URBAN"] * n,
        "lambda_i": [0.0001234567] * n, "rr_i": [1.3612345] * n,
        "score": [88.456] * n, "risk_level_cd": ["danger"] * n,
        "order_key": list(range(1, n + 1)),
        "is_explore": [True] + [False] * (n - 1), "is_estimated": [False] * n,
        "basis": [f"미보급 · 동선 {i + 1}" for i in range(n)],
        "rx_code_cd": ["RX-IOT"] * n, "score_version": ["v0-20260805"] * n,
        "computed_at": ["2026-08-05T01:00:00+09:00"] * n,
    })


def _units(keys):
    return pd.DataFrame({
        "bld_key": keys, "unit_seq": [1] * len(keys), "ho_nm": ["본가구"] * len(keys),
        "flr_no": [1] * len(keys), "ho_nm_source_cd": ["implicit"] * len(keys),
    })


# ── DDL 계약 ────────────────────────────────────────────────────────────
def test_생성컬럼은_파이프라인이_채우지_않는다():
    """`building_id`(bigserial)·`address_norm`(GENERATED)은 값을 넣으면 에러가 난다."""
    assert "building_id" not in BUILDING_COLUMNS
    assert "address_norm" not in BUILDING_COLUMNS


def test_units는_정적_4컬럼만_낸다():
    """ADR-015 — 업무 상태 3컬럼은 BE 전용이라 절대 쓰지 않는다."""
    assert UNIT_COLUMNS == ["bld_key", "unit_seq", "ho_nm", "flr_no", "ho_nm_source_cd"]
    for banned in ("status_cd", "last_inspected_day", "rx_baseline_day"):
        assert banned not in UNIT_COLUMNS


def test_좌표와_점수는_DDL_정밀도로_반올림된다():
    b = build_buildings_csv(_scored(1))
    assert b["lat"].iat[0] == 37.478457  # numeric(9,6)
    assert b["score"].iat[0] == 88.46  # numeric(5,2)


def test_고아_세대는_버린다():
    """적재되지 못한 건물의 세대가 남으면 FK가 깨진다."""
    u = build_units_csv(_units(["K0", "K1", "없는키"]), keep_keys={"K0", "K1"})
    assert list(u["bld_key"]) == ["K0", "K1"]


# ── 검증 ────────────────────────────────────────────────────────────────
def _geojson():
    return {"type": "FeatureCollection", "features": [{"type": "Feature"}]}


def test_정상_seed는_통과한다():
    b = build_buildings_csv(_scored(20))
    b["is_explore"] = [True] + [False] * 19  # 5%
    u = build_units_csv(_units([f"K{i}" for i in range(20)]), keep_keys=set(b["bld_key"]))
    assert validate_seed(b, u, _geojson()) == []


def test_order_key가_끊기면_잡는다():
    b = build_buildings_csv(_scored(20))
    b["is_explore"] = [True] + [False] * 19
    b.loc[0, "order_key"] = 999
    u = build_units_csv(_units([f"K{i}" for i in range(20)]), keep_keys=set(b["bld_key"]))
    assert any("order_key" in e for e in validate_seed(b, u, _geojson()))


def test_units_행수가_안_맞으면_잡는다():
    b = build_buildings_csv(_scored(20))
    b["is_explore"] = [True] + [False] * 19
    u = build_units_csv(_units([f"K{i}" for i in range(19)]), keep_keys=set(b["bld_key"]))
    assert any("Σunit_count" in e for e in validate_seed(b, u, _geojson()))


def test_탐사쿼터가_범위를_벗어나면_잡는다():
    b = build_buildings_csv(_scored(20))
    b["is_explore"] = [False] * 20  # 0%
    u = build_units_csv(_units([f"K{i}" for i in range(20)]), keep_keys=set(b["bld_key"]))
    assert any("탐사 쿼터" in e for e in validate_seed(b, u, _geojson()))


def test_GeoJSON이_비면_잡는다():
    b = build_buildings_csv(_scored(20))
    b["is_explore"] = [True] + [False] * 19
    u = build_units_csv(_units([f"K{i}" for i in range(20)]), keep_keys=set(b["bld_key"]))
    assert any("GeoJSON" in e for e in validate_seed(b, u, {"features": []}))


# ── GeoJSON ─────────────────────────────────────────────────────────────
def test_좌표는_5자리로_반올림된다():
    grids = pd.DataFrame([{
        "grid1k": "다사4641", "region_type_cd": "URBAN", "households": 120.0,
        "buildings": 5, "avg_score": 71.234, "risk_level_cd": "danger",
    }])
    ring = [[126.951612345, 37.478498765], [126.96, 37.48], [126.951612345, 37.478498765]]
    gj = build_grid_geojson(grids, boundaries={"다사4641": ring})
    coords = gj["features"][0]["geometry"]["coordinates"][0]
    assert coords[0] == [126.95161, 37.4785]
    assert gj["features"][0]["properties"]["avg_score"] == 71.2


def test_경계가_없는_격자는_건너뛴다():
    grids = pd.DataFrame([{
        "grid1k": "없음", "region_type_cd": "URBAN", "households": 1.0,
        "buildings": 1, "avg_score": 50.0, "risk_level_cd": "warn",
    }])
    assert build_grid_geojson(grids, boundaries={})["features"] == []


# ── 원자성 (ADR-008 §9) ─────────────────────────────────────────────────
def test_세_산출물이_함께_생긴다(tmp_path):
    b = build_buildings_csv(_scored(2))
    u = build_units_csv(_units(["K0", "K1"]), keep_keys={"K0", "K1"})
    written = write_seed(tmp_path, b, u, _geojson())
    assert {p.name for p in written} == {"buildings.csv", "units.csv", "grids.geojson"}
    assert json.loads((tmp_path / "grids.geojson").read_text())["type"] == "FeatureCollection"


def test_CSV는_BOM_없이_UTF8이다(tmp_path):
    b = build_buildings_csv(_scored(1))
    u = build_units_csv(_units(["K0"]), keep_keys={"K0"})
    write_seed(tmp_path, b, u, _geojson())
    assert not (tmp_path / "buildings.csv").read_bytes().startswith(b"\xef\xbb\xbf")


# ── 지역 사전 ───────────────────────────────────────────────────────────
def _names():
    return {"1162069500": ("서울특별시", "관악구", "신림동"),
            "5275025000": ("전북특별자치도", "임실군", "임실읍")}


def _bld_regions():
    return pd.DataFrame({
        "admin_dong_cd": ["1162069500", "1162069500", "5275025000"],
        "sido_cd": ["11", "11", "52"],
        "sigungu_cd": ["11620", "11620", "52750"],
    })


def test_지역사전은_3계층을_낸다():
    """`buildings`에 명칭 컬럼이 없어 이름 없이는 지역 셀렉터를 못 그린다."""
    r = build_regions_csv(_bld_regions(), names=_names())
    assert list(r.columns) == REGION_COLUMNS
    assert dict(r["level"].value_counts()) == {"sido": 2, "sigungu": 2, "dong": 2}
    assert list(r.loc[r["level"] == "sido", "code"]) == ["11", "52"]


def test_부모_코드는_접두사_관계다():
    """실측 확인 — admin_dong_cd[:5] == sigungu_cd, [:2] == sido_cd."""
    r = build_regions_csv(_bld_regions(), names=_names()).set_index("code")
    assert r.loc["11620", "parent_code"] == "11"
    assert r.loc["1162069500", "parent_code"] == "11620"
    assert pd.isna(r.loc["11", "parent_code"]) or r.loc["11", "parent_code"] is None


def test_이름을_못_찾은_지역은_빠진다():
    r = build_regions_csv(_bld_regions(), names={"1162069500": ("서울특별시", "관악구", "신림동")})
    assert "5275025000" not in set(r["code"])


def test_명칭_누락은_검증에서_잡힌다():
    """지역 셀렉터가 그려지지 않는 상태로 적재되면 안 된다."""
    b = build_buildings_csv(_scored(20))
    b["is_explore"] = [True] + [False] * 19
    u = build_units_csv(_units([f"K{i}" for i in range(20)]), keep_keys=set(b["bld_key"]))
    empty = pd.DataFrame(columns=REGION_COLUMNS)
    assert any("regions에" in e for e in validate_seed(b, u, _geojson(), empty))


def test_지역사전도_함께_산출된다(tmp_path):
    b = build_buildings_csv(_scored(2))
    u = build_units_csv(_units(["K0", "K1"]), keep_keys={"K0", "K1"})
    r = build_regions_csv(_bld_regions(), names=_names())
    written = write_seed(tmp_path, b, u, _geojson(), r)
    assert (tmp_path / "regions.csv").exists()
    assert len(written) == 4
