"""지역 코드 체계 3종 혼재 — 2026-08-04 실측으로 확인된 함정의 회귀 방지."""

from __future__ import annotations

import pytest

from daullim_data.regions import (
    BJDONG_CSV,
    REGIONS,
    assert_current_mois,
    bjdong_codes,
    load_bjdong,
    region,
    sigungu_code,
)
from daullim_data.utils import DataTrapError

needs_codes = pytest.mark.skipif(
    not BJDONG_CSV.exists(), reason="data/codes/ 법정동코드 미배치 (data/README.md 참조)"
)


# ── 체계를 명시하지 않으면 못 꺼낸다 ────────────────────────────────────
def test_같은_시군구가_체계마다_다른_코드다():
    assert sigungu_code("gwanak", "kostat") == "11210"
    assert sigungu_code("gwanak", "mois") == "11620"
    assert sigungu_code("imsil", "kostat") == "35550"
    assert sigungu_code("imsil", "mois") == "52750"


def test_서울만_시도2자리가_우연히_일치한다():
    """서울로 테스트하면 통과하고 전북에서 깨지는 패턴의 근원."""
    assert sigungu_code("gwanak", "kostat")[:2] == sigungu_code("gwanak", "mois")[:2]
    assert sigungu_code("imsil", "kostat")[:2] != sigungu_code("imsil", "mois")[:2]


def test_체계명을_안_주면_죽는다():
    with pytest.raises(DataTrapError, match="코드 체계"):
        sigungu_code("gwanak", "sigungu")


def test_미등록_지역은_죽는다():
    with pytest.raises(DataTrapError, match="미등록 시연 지역"):
        region("jongno")


def test_시연지역은_ADR_010_개정1의_넷이다():
    assert set(REGIONS) == {"gwanak", "imsil", "gijang", "busanjin"}


def test_기장군_부산진구_코드():
    assert sigungu_code("gijang", "kostat") == "21510"
    assert sigungu_code("gijang", "mois") == "26710"
    assert sigungu_code("busanjin", "kostat") == "21050"
    assert sigungu_code("busanjin", "mois") == "26230"


def test_기장군은_존이_둘이다():
    """100km 존 경계(마라/마마)에 걸치는 유일한 시연 지역 — zone[0] 고정 금지."""
    assert region("gijang").zone == ("마라", "마마")
    assert region("busanjin").zone == ("마라",)


# ── 현행 코드 검증 ──────────────────────────────────────────────────────
@needs_codes
def test_현행_코드는_통과한다():
    assert assert_current_mois("11620") == "11620"  # 관악구
    assert assert_current_mois("52750") == "52750"  # 임실군
    assert assert_current_mois("26710") == "26710"  # 기장군
    assert assert_current_mois("26230") == "26230"  # 부산진구


@needs_codes
def test_전북_구코드는_폐지로_잡힌다():
    """2024-01-18 전북특별자치도 출범. 45750으로 API를 부르면
    에러가 아니라 totalCount:0이 정상 응답으로 온다 — 그래서 여기서 막는다."""
    with pytest.raises(DataTrapError, match="폐지"):
        assert_current_mois("45750")


@needs_codes
def test_통계청_코드를_넣으면_잡힌다():
    """임실군 통계청 코드 35550 — 행정표준코드에는 35 시도가 없다."""
    with pytest.raises(DataTrapError, match="없는 값"):
        assert_current_mois("35550")


@needs_codes
def test_부산_21은_없는_코드가_아니라_폐지_코드다():
    """이 케이스가 이 모듈의 존재 이유다.

    통계청 부산 = 21인데, 행정표준코드에도 21이 **존재**한다(폐지된 '부산직할시').
    '없는 코드인가'로만 검사하면 통과해 버린다 — '현행인가'로 검사해야 잡힌다.
    """
    df = load_bjdong()
    row = df.loc[df["code"] == "2100000000"].iloc[0]
    assert "부산직할시" in row["name"] and not row["active"]
    with pytest.raises(DataTrapError, match="폐지"):
        assert_current_mois("21")


@needs_codes
def test_형식이_아니면_조회하지_않고_죽는다():
    with pytest.raises(DataTrapError, match="형식 아님"):
        assert_current_mois("1162")


# ── 표제부 API 순회 단위 ────────────────────────────────────────────────
@needs_codes
def test_관악구_법정동은_봉천_신림_남현_셋():
    codes = bjdong_codes("gwanak")
    assert len(codes) == 3
    assert {n.split()[-1] for _, n in codes} == {"봉천동", "신림동", "남현동"}


@needs_codes
def test_임실군은_리_단위까지_내려간다():
    """읍면(12) + 리(131)가 둘 다 코드로 존재해 중복 수집 위험이 있다.
    기본값은 리 레벨만 — 어느 쪽이 하위를 포함하는지는 실제 응답으로 확정한다."""
    leaf = bjdong_codes("imsil")
    both = bjdong_codes("imsil", include_upper=True)
    assert len(both) == 143
    assert len(leaf) < len(both)
    assert all(not c.endswith("00") for c, _ in leaf)


@needs_codes
def test_bjdongCd는_5자리다():
    for code, _ in bjdong_codes("gwanak"):
        assert len(code) == 5 and code.isdigit()


@needs_codes
def test_부산진구는_11개_동():
    codes = bjdong_codes("busanjin")
    assert len(codes) == 11
    assert "초읍동" in {n.split()[-1] for _, n in codes}


@needs_codes
def test_기장군도_임실군처럼_읍면과_리가_둘다_존재한다():
    leaf = bjdong_codes("gijang")
    both = bjdong_codes("gijang", include_upper=True)
    assert len(leaf) < len(both)
    assert all(not c.endswith("00") for c, _ in leaf)
