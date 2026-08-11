"""건물 마스터 — 유형 판정과 `units` 생성 규칙 잠금. 외부 API 미호출, 픽스처는 실측(2026-08-04) 이식."""

from __future__ import annotations

import pandas as pd
import pytest

from daullim_data.buildings import (
    APT,
    DETACHED,
    MULTI_FAMILY,
    MULTI_UNIT,
    MULTI_USER,
    ROW_HOUSE,
    ROW_HOUSE_AREA,
    GeoResult,
    build_master,
    classify_house,
    jibun_address,
    road_address,
    unit_count_of,
)


# ── 유형 5분류 ──────────────────────────────────────────────────────────
def test_명시값이_추론보다_우선한다():
    """etcPurps에 세부 유형이 있으면 그대로 쓴다(실측 11.3%)."""
    assert classify_house("공동주택", "연립주택", floors=3, total_area=100, families=0) == (
        ROW_HOUSE, "명시",
    )
    assert classify_house("단독주택", "다가구주택", floors=2, total_area=100, families=0) == (
        MULTI_FAMILY, "명시",
    )


def test_공동주택은_연면적_660으로_연립과_다세대를_가른다():
    """건축법 시행령 기준. 명시적 '연립주택'(3층·2,179㎡)이 이 규칙으로도 row-house다."""
    assert classify_house("공동주택", "공동주택", floors=3, total_area=2179.32, families=0)[0] == ROW_HOUSE
    assert classify_house("공동주택", "공동주택", floors=3, total_area=414.72, families=0)[0] == MULTI_UNIT
    # 경계값 — 660㎡ '초과'가 연립이다
    assert classify_house("공동주택", "공동주택", floors=4, total_area=ROW_HOUSE_AREA, families=0)[0] == MULTI_UNIT


def test_5층_이상_공동주택은_아파트라서_제외된다():
    """비아파트 사업이라 스코프 밖 — DDL 5분류에도 없다."""
    assert classify_house("공동주택", "공동주택", floors=5, total_area=300, families=0)[0] == APT
    assert classify_house("공동주택", "아파트", floors=3, total_area=300, families=0)[0] == APT


def test_단독계열은_가구수로_다가구를_가른다():
    assert classify_house("단독주택", "단독주택", floors=2, total_area=200, families=1)[0] == DETACHED
    assert classify_house("단독주택", "단독주택", floors=2, total_area=200, families=5)[0] == MULTI_FAMILY


def test_주택이_아니면_None():
    assert classify_house("제2종근린생활시설", "근린생활시설", floors=5, total_area=900, families=0) == (
        None, "주택 아님",
    )


# ── 세대수 ──────────────────────────────────────────────────────────────
def test_단독과_다중은_무조건_1세대다():
    """ADR-015 '1행,ho_nm=본가구' 규정 — 실측 fmlyCnt=0·hoCnt=16 사례로 unit_count 불일치 방지."""
    assert unit_count_of(DETACHED, families=0, households=0, hos=16) == 1
    assert unit_count_of(MULTI_USER, families=9, households=0, hos=0) == 1


def test_세대수는_유형별로_다른_필드에서_온다():
    """단독 계열 → fmlyCnt / 공동 계열 → hhldCnt (실측 확정)."""
    assert unit_count_of(MULTI_FAMILY, families=12, households=0, hos=0) == 12
    assert unit_count_of(MULTI_UNIT, families=0, households=8, hos=0) == 8
    assert unit_count_of(ROW_HOUSE, families=0, households=19, hos=0) == 19


def test_세대수는_최소_1이다():
    """DDL이 unit_count > 0을 요구한다."""
    assert unit_count_of(MULTI_UNIT, families=0, households=0, hos=0) == 1


# ── 주소 조립 ───────────────────────────────────────────────────────────
def test_지번주소는_bun_ji로_조립한다():
    """platPlc에는 번지가 없다 — 실측."""
    row = {"platPlc": "서울특별시 관악구 봉천동 ", "bun": "0001", "ji": "0052"}
    assert jibun_address(row) == "서울특별시 관악구 봉천동 1-52"
    assert jibun_address({**row, "ji": "0000"}) == "서울특별시 관악구 봉천동 1"


def test_도로명주소는_공백이면_빈문자열():
    assert road_address({"newPlatPlc": " "}) == ""


# ── units 생성 규칙 (ADR-015) ───────────────────────────────────────────
def _title(**kw):
    base = {
        "mgmBldrgstPk": "PK1", "sigunguCd": "11620", "bjdongCd": "10100",
        "mainPurpsCdNm": "단독주택", "etcPurps": "단독주택", "grndFlrCnt": 2,
        "totArea": 200.0, "fmlyCnt": 1, "hhldCnt": 0, "hoCnt": 0,
        "newPlatPlc": "서울특별시 관악구 봉천로 1", "platPlc": "서울특별시 관악구 봉천동 ",
        "bun": "0001", "ji": "0000", "useAprDay": "20010101", "platGbCd": "0",
    }
    base.update(kw)
    return base


def _geo(_addr, kind="road"):
    return GeoResult(lat=37.48, lng=126.95, admin_dong_cd="1162069500")


def test_단독은_본가구_한_행_implicit():
    b, u, rep = build_master("gwanak", titles=[_title()], geocoder=_geo, expos_fetcher=lambda r: [])
    assert len(u) == 1
    assert u.iloc[0]["ho_nm"] == "본가구"
    assert u.iloc[0]["ho_nm_source_cd"] == "implicit"
    assert int(b.iloc[0]["unit_count"]) == 1


def test_다가구는_세대수만큼_빈_행_field():
    t = _title(etcPurps="다가구주택", fmlyCnt=12)
    b, u, rep = build_master("gwanak", titles=[t], geocoder=_geo, expos_fetcher=lambda r: [])
    assert len(u) == 12
    assert u["ho_nm"].isna().all()
    assert set(u["ho_nm_source_cd"]) == {"field"}


def test_다세대는_전유부가_있으면_실호수를_쓴다():
    """C안 — ho_nm_source_cd가 field가 아니라 expos가 된다."""
    t = _title(mainPurpsCdNm="공동주택", etcPurps="다세대주택", hhldCnt=3, fmlyCnt=0)
    expos = [{"hoNm": "101호", "flrNo": 1}, {"hoNm": "201호", "flrNo": 2}, {"hoNm": "102호", "flrNo": 1}]
    b, u, rep = build_master("gwanak", titles=[t], geocoder=_geo, expos_fetcher=lambda r: expos)
    assert set(u["ho_nm_source_cd"]) == {"expos"}
    assert list(u["ho_nm"]) == ["101호", "102호", "201호"]  # 호수 오름차순
    assert list(u["unit_seq"]) == [1, 2, 3]


def test_전유부_개수가_세대수와_어긋나면_믿지_않는다():
    """같은 지번에 여러 동이 섞여 들어올 수 있다 — 그럴 땐 field로 정직하게 떨어진다."""
    t = _title(mainPurpsCdNm="공동주택", etcPurps="다세대주택", hhldCnt=3, fmlyCnt=0)
    expos = [{"hoNm": f"{i}호", "flrNo": 1} for i in range(120)]  # 아파트 단지 전체가 온 경우
    b, u, rep = build_master("gwanak", titles=[t], geocoder=_geo, expos_fetcher=lambda r: expos)
    assert len(u) == 3
    assert set(u["ho_nm_source_cd"]) == {"field"}


def test_아파트는_제외된다():
    t = _title(mainPurpsCdNm="공동주택", etcPurps="아파트", hhldCnt=30, fmlyCnt=0)
    b, u, rep = build_master("gwanak", titles=[t], geocoder=_geo, expos_fetcher=lambda r: [])
    assert b.empty and rep.apartments == 1


def test_좌표를_못_얻으면_행을_만들지_않는다():
    """lat/lng NOT NULL — 좌표 없이는 단 한 행도 INSERT되지 않는다."""
    b, u, rep = build_master(
        "gwanak", titles=[_title()], geocoder=lambda a, kind="road": GeoResult(),
        expos_fetcher=lambda r: [],
    )
    assert b.empty and rep.geocode_failed == 1


def test_도로명이_실패하면_지번으로_폴백하고_추정표시한다():
    calls = []

    def geo(addr, kind="road"):
        calls.append(kind)
        return GeoResult() if kind == "road" else GeoResult(lat=37.4, lng=126.9, admin_dong_cd="1162069500")

    b, u, rep = build_master("gwanak", titles=[_title()], geocoder=geo, expos_fetcher=lambda r: [])
    assert calls == ["road", "parcel"]
    assert bool(b.iloc[0]["is_estimated"]) is True
    assert rep.geocoded_jibun == 1


def test_bld_key가_없거나_중복이면_버린다():
    """UPSERT 키가 성립하지 않는 행은 적재 대상이 아니다."""
    rows = [_title(mgmBldrgstPk="A"), _title(mgmBldrgstPk="A"), _title(mgmBldrgstPk="")]
    b, u, rep = build_master("gwanak", titles=rows, geocoder=_geo, expos_fetcher=lambda r: [])
    assert list(b["bld_key"]) == ["A"]


def test_보급이력은_전량_NULL이다():
    """확정 결정 1 — 통합 대장 부재로 실데이터가 존재하지 않는다."""
    b, u, rep = build_master("gwanak", titles=[_title()], geocoder=_geo, expos_fetcher=lambda r: [])
    assert b.iloc[0]["install_day"] is None
    assert b.iloc[0]["install_year"] is None
    assert b.iloc[0]["detector_model"] is None


def test_사용승인일이_형식에_안_맞으면_NULL():
    b, u, rep = build_master(
        "gwanak", titles=[_title(useAprDay="2001")], geocoder=_geo, expos_fetcher=lambda r: []
    )
    assert b.iloc[0]["use_apr_day"] is None


def test_units_행수가_unit_count_합과_같다():
    rows = [
        _title(mgmBldrgstPk="A"),
        _title(mgmBldrgstPk="B", etcPurps="다가구주택", fmlyCnt=7),
        _title(mgmBldrgstPk="C", mainPurpsCdNm="공동주택", etcPurps="다세대주택", hhldCnt=4, fmlyCnt=0),
    ]
    b, u, rep = build_master("gwanak", titles=rows, geocoder=_geo, expos_fetcher=lambda r: [])
    assert len(u) == int(b["unit_count"].sum()) == 12


def test_전유부_호수가_중복이면_믿지_않는다():
    """같은 지번 내 동마다 '2층201호' 반복 입력(실측 3.9%) — ux_units_bld_ho 유니크 제약 위반 방지로 field 처리."""
    t = _title(mainPurpsCdNm="공동주택", etcPurps="다세대주택", hhldCnt=4, fmlyCnt=0)
    expos = [{"hoNm": "201호", "flrNo": 2}, {"hoNm": "301호", "flrNo": 3},
             {"hoNm": "201호", "flrNo": 2}, {"hoNm": "301호", "flrNo": 3}]  # 2개 동
    b, u, rep = build_master("gwanak", titles=[t], geocoder=_geo, expos_fetcher=lambda r: expos)
    assert set(u["ho_nm_source_cd"]) == {"field"}
    assert u["ho_nm"].isna().all()


def test_행정동_결측은_최근접_건물로_채우고_추정표시한다():
    """지번 폴백 응답에는 level4AC가 없다 — NOT NULL이라 비면 행이 통째로 빠진다."""
    from daullim_data.buildings import fill_missing_dong

    df = pd.DataFrame({
        "lat": [37.480, 37.481, 37.600], "lng": [126.950, 126.951, 127.100],
        "admin_dong_cd": ["1162069500", None, "1168000000"],
        "is_estimated": [False, True, False],
    })
    out, filled = fill_missing_dong(df)
    assert filled == 1
    assert out.loc[1, "admin_dong_cd"] == "1162069500"  # 14m 옆 건물
    assert bool(out.loc[1, "is_estimated"]) is True
    assert out["admin_dong_cd"].notna().all()
