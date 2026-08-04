"""ADR-009 D8: 함정 재현 테스트 — 실측에서 실제로 터졌던 케이스 그대로."""

from __future__ import annotations

import unicodedata

import pandas as pd
import pytest

from daullim_data.utils import (
    DataTrapError,
    RANGE_SPEC_WEATHER,
    ZONE_PREFIX,
    cell_key,
    clip_to_sido,
    fill_report,
    glob_kr,
    grid500_to_1km,
    nfc,
    normalize_month,
    normalize_year_counts,
    read_csv_kr,
    round_coords,
    to_4326,
    to_5179,
    validate_ranges,
    write_csv_kr,
    write_outputs_atomic,
    year_weight,
)


# ── 1. 인코딩 ───────────────────────────────────────────────────────────
def test_cp949_파일을_읽는다(tmp_path):
    """소방청 전국 파일·SGIS가 cp949다. UTF-8 시도 실패 후 폴백해야 한다."""
    p = tmp_path / "cp949.csv"
    p.write_bytes("시도,값\n서울특별시,1\n".encode("cp949"))
    df = read_csv_kr(p)
    assert df.loc[0, "시도"] == "서울특별시"


def test_utf8_sig_파일을_읽는다(tmp_path):
    """플랫폼 상품(476·462)이 UTF-8-SIG. BOM이 컬럼명에 붙으면 안 된다."""
    p = tmp_path / "bom.csv"
    p.write_bytes("﻿GRID_ID,DCSD_CNT\n다사46a41a,2\n".encode("utf-8"))
    df = read_csv_kr(p)
    assert list(df.columns) == ["GRID_ID", "DCSD_CNT"]


def test_둘다_아니면_추측하지_않고_죽는다(tmp_path):
    p = tmp_path / "utf16.csv"
    p.write_bytes("시도,값\n서울,1\n".encode("utf-16"))
    with pytest.raises(DataTrapError, match="디코드 실패"):
        read_csv_kr(p)


def test_산출물은_BOM_없이_쓴다(tmp_path):
    out = write_csv_kr(pd.DataFrame({"a": [1]}), tmp_path / "out.csv")
    assert not out.read_bytes().startswith(b"\xef\xbb\xbf")


# ── 2. 한글 정규화 ──────────────────────────────────────────────────────
def test_NFD와_NFC는_눈으로_같지만_다른_문자열이다():
    nfd = unicodedata.normalize("NFD", "관악구")
    assert nfd != "관악구"  # 이게 조인을 조용히 깨뜨린다
    assert nfc(nfd) == "관악구"


def test_NFD_파일명을_NFC_패턴으로_찾는다(tmp_path):
    """실측: fire·SGIS 원본이 NFD라 일반 glob이 0건을 냈다(검수 중 2회)."""
    (tmp_path / unicodedata.normalize("NFD", "화재발생_서울.csv")).write_text("x")
    assert list(tmp_path.glob("*서울*.csv")) == []  # 표준 glob은 못 찾는다
    assert len(glob_kr(tmp_path, "*서울*.csv")) == 1


# ── 3. 월 필드 ──────────────────────────────────────────────────────────
@pytest.mark.parametrize(
    "raw,expected",
    [("1", "01"), ("9", "09"), ("10", "10"), (3, "03"), (" 7 ", "07"), ("", None), (None, None)],
)
def test_월_2자리_패딩(raw, expected):
    assert normalize_month(raw) == expected


@pytest.mark.parametrize("bad", ["13", "0", "삼월"])
def test_잘못된_월은_죽는다(bad):
    with pytest.raises(DataTrapError):
        normalize_month(bad)


# ── 4. 값 범위 + 충전율 ─────────────────────────────────────────────────
def test_적설_음수는_fail_fast():
    df = pd.DataFrame({"HR_UNIT_SNWFL": [0.0, -3.0]})
    with pytest.raises(DataTrapError, match="HR_UNIT_SNWFL"):
        validate_ranges(df, RANGE_SPEC_WEATHER, name="기상")


def test_습도_100초과는_fail_fast():
    df = pd.DataFrame({"HR_UNIT_HUM": [55.0, 120.0]})
    with pytest.raises(DataTrapError, match="HR_UNIT_HUM"):
        validate_ranges(df, RANGE_SPEC_WEATHER, name="기상")


def test_범위검사만으로는_스왑이_안_잡힌다__충전율이_탐지수단이다():
    """실측 스왑: 습도 0.1~17(충전 3%) / 적설 7~100(충전 100%).

    두 값 모두 각자의 허용 범위 안이라 범위 검사는 **통과한다.**
    스왑을 드러내는 건 충전율 비대칭이다 — 그래서 리포트를 항상 함께 낸다.
    """
    df = pd.DataFrame(
        {
            "HR_UNIT_HUM": [0.1] + [None] * 97 + [17.1, None],
            "HR_UNIT_SNWFL": [50.0] * 100,
        }
    )
    report = validate_ranges(df, RANGE_SPEC_WEATHER, name="기상")  # 통과한다
    assert report.fill_pct["HR_UNIT_HUM"] < 5
    assert report.fill_pct["HR_UNIT_SNWFL"] == 100.0
    assert "충전율" in report.render()


def test_충전율_리포트는_개방편차를_드러낸다():
    """출동·도착 시각은 전북만 채워져 있고 서울·부산은 0%였다."""
    df = pd.DataFrame({"DSPT_DRTV_DT": [None] * 10, "GRID_ID": ["다사46a41a"] * 10})
    r = fill_report(df, ["DSPT_DRTV_DT", "GRID_ID"], name="신고")
    assert r.fill_pct["DSPT_DRTV_DT"] == 0.0
    assert r.fill_pct["GRID_ID"] == 100.0


# ── 5. 시도 경계 클리핑 ─────────────────────────────────────────────────
def test_시도_밖_격자를_잘라낸다():
    """미클리핑 시 서울 신고 격자가 이론치의 14배로 팽창했다."""
    df = pd.DataFrame({"GRID_ID": ["다사46a41a", "마라10a10a", "다마30a30a"]})
    assert len(clip_to_sido(df, "서울")) == 1
    assert len(clip_to_sido(df, "전북")) == 1


def test_전북은_존이_셋이다():
    assert ZONE_PREFIX["전북"] == ("나마", "다마", "라마")


def test_미등록_시도는_죽는다():
    with pytest.raises(DataTrapError, match="존 프리픽스 미등록"):
        clip_to_sido(pd.DataFrame({"GRID_ID": []}), "제주")


# ── 6. 격자 조인 ────────────────────────────────────────────────────────
def test_500m를_1km로_유도한다():
    assert grid500_to_1km("다사46a41a") == "다사4641"
    assert grid500_to_1km("다마30b57b") == "다마3057"


def test_NFD로_들어온_격자ID도_유도된다():
    assert grid500_to_1km(unicodedata.normalize("NFD", "다사46a41a")) == "다사4641"


@pytest.mark.parametrize("bad", ["다사4641", "다사46a41", "", "46a41a"])
def test_형식이_다르면_조용히_넘기지_않는다(bad):
    with pytest.raises(DataTrapError, match="형식 아님"):
        grid500_to_1km(bad)


# ── 7. 좌표계 ───────────────────────────────────────────────────────────
def test_4326_5179_왕복():
    lat, lng = 37.4784, 126.9516  # 관악구청 부근
    x, y = to_5179(lat, lng)
    assert 900_000 < x < 1_100_000 and 1_700_000 < y < 2_000_000
    back_lat, back_lng = to_4326(x, y)
    assert abs(back_lat - lat) < 1e-6 and abs(back_lng - lng) < 1e-6


def test_같은_500m_안의_두_점은_같은_셀키():
    a = cell_key(37.4784, 126.9516)
    b = cell_key(37.4785, 126.9517)  # 약 14m 차이
    assert a == b
    assert a[0] % 500 == 0 and a[1] % 500 == 0


def test_위경도_인자_순서를_바꾸면_한국_밖으로_나간다():
    """always_xy 때문에 실수하기 쉬운 지점 — 회귀 방지."""
    x, y = to_5179(126.9516, 37.4784)  # 일부러 뒤집음
    assert not (900_000 < x < 1_100_000 and 1_700_000 < y < 2_000_000)


# ── 8. 연도 정규화 ──────────────────────────────────────────────────────
def test_최근가중은_정의서_값이다():
    assert [year_weight(y) for y in (2020, 2021, 2022, 2023)] == [0.15, 0.20, 0.25, 0.40]
    assert year_weight(2019) == 0.0


def test_2021_계단식_급증을_연도내_상대값으로_흡수한다():
    """분류 정책 단절이라 건수 자체를 그대로 쓰면 2021 이후가 과대평가된다."""
    raw = {2020: 100, 2021: 400, 2022: 420, 2023: 430}
    norm = normalize_year_counts(raw)
    assert abs(sum(norm.values()) - 1.0) < 1e-9
    assert norm[2021] < 1.0


# ── 9. 산출 원자성 ──────────────────────────────────────────────────────
def test_좌표는_5자리로_반올림한다():
    assert round_coords([126.951612345, 37.478498765]) == [126.95161, 37.4785]


def test_CSV와_GeoJSON은_함께_생긴다(tmp_path):
    csv_p, geo_p = tmp_path / "buildings.csv", tmp_path / "grid.geojson"
    write_outputs_atomic(
        {
            csv_p: lambda p: p.write_text("bld_key\nA"),
            geo_p: lambda p: p.write_text("{}"),
        }
    )
    assert csv_p.exists() and geo_p.exists()


def test_중간에_실패하면_반쪽_산출물을_남기지_않는다(tmp_path):
    """CSV만 새로 쓰이고 GeoJSON은 옛 버전인 상태가 가장 위험하다."""
    csv_p, geo_p = tmp_path / "buildings.csv", tmp_path / "grid.geojson"
    csv_p.write_text("OLD")

    def boom(_):
        raise RuntimeError("지오코딩 실패")

    with pytest.raises(RuntimeError):
        write_outputs_atomic({csv_p: lambda p: p.write_text("NEW"), geo_p: boom})

    assert csv_p.read_text() == "OLD"  # 기존 산출물 보존
    assert not list(tmp_path.glob("*.tmp"))  # 임시파일 잔여 없음
