"""원본 적재·검증 — 합성 픽스처로 함정 동작(계수 규칙) 고정. 실데이터 검증은 run_ingest.py 로그(§9-5) 담당."""

from __future__ import annotations

import pandas as pd
import pytest

from daullim_data.ingest import (
    GRID500_PATTERN,
    SILENT_MIN_TOTAL,
    load_fires,
    silent_activity,
    year_share,
    yearly_totals,
)
from daullim_data.utils import DataTrapError

HEADER = [
    "GRID_ID,LAT,LOT,DCSD_CNT,INJPSN_CNT,PRPT_DAM_AMT,OCRN_YMD,OCRN_YR,OCRN_MM,"
    "DSPT_REQ_HR,FRSTN_GRNDS_DSTNC,CTY_FRMVL_SE_NM,FCLT_PLC_LCLSF_NM,CTPV_NM,SGG_NM,EMD_NM,"
    "HR_UNIT_HUM,HR_UNIT_SNWFL,HR_UNIT_RN,HR_UNIT_WSPD"
]


def _row(grid="다사46a41a", lat=37.4784, lng=126.9516, deaths=0, place="주거", mm=3, snow=0):
    return (
        f"{grid},{lat},{lng},{deaths},0,1000,20230315,2023,{mm},"
        f"300,2,도시,{place},서울특별시,관악구,신림동,50,{snow},0,2"
    )


def _write(tmp_path, rows, name="화재발생 건별 격자 정보_2023_서울.csv"):
    p = tmp_path / name
    p.write_text("\n".join(HEADER + rows) + "\n", encoding="utf-8-sig")
    return p


# ── 손실 사유를 뭉치지 않는다 ───────────────────────────────────────────
def test_격자_미부여와_경계밖을_따로_센다(tmp_path):
    """둘을 합치면 클리핑이 실제로 한 일을 알 수 없다 — 후속 처리도 다르다."""
    src = _write(
        tmp_path,
        [
            _row(),  # 정상 (서울)
            _row(grid=""),  # 격자 미부여
            _row(grid="마라10a10a"),  # 부산 존 = 경계 밖
        ],
    )
    df, rep = load_fires("서울", path=src)
    assert rep.rows_raw == 3
    assert rep.rows_no_grid == 1
    assert rep.rows_out_of_sido == 1
    assert rep.rows_kept == 1 == len(df)


def test_좌표_결측은_클리핑_전_기준으로_보고한다(tmp_path):
    """클리핑 후에 세면 0건으로 보여서 상향 집계 대상이 사라진다."""
    src = _write(tmp_path, [_row(), _row(grid="", lat="", lng="")])
    _, rep = load_fires("서울", path=src)
    assert "클리핑 전 기준" in rep.render()
    assert "50.00%" in rep.render()


# ── 파생 컬럼 ───────────────────────────────────────────────────────────
def test_파생_컬럼이_붙는다(tmp_path):
    src = _write(tmp_path, [_row(place="주거", mm=3), _row(place="판매/업무시설", mm=11)])
    df, _ = load_fires("서울", path=src)
    assert list(df["grid1k"]) == ["다사4641", "다사4641"]
    assert list(df["is_residential"]) == [True, False]
    assert list(df["month"]) == ["03", "11"]  # 비패딩 월이 패딩된다
    assert df["occurred"].dt.year.eq(2023).all()


def test_값_범위_위반은_적재_단계에서_죽는다(tmp_path):
    """적설 음수 — fail-fast가 파이프라인 입구에서 걸려야 한다."""
    src = _write(tmp_path, [_row(snow=-5)])
    with pytest.raises(DataTrapError, match="HR_UNIT_SNWFL"):
        load_fires("서울", path=src)


def test_원본이_없으면_경로를_알려주고_죽는다(tmp_path):
    """FileNotFoundError를 그대로 흘리지 않는다 — 배치 경로를 알려줘야 다음 사람이 고친다."""
    with pytest.raises(DataTrapError, match="원본 없음"):
        load_fires("서울", path=tmp_path / "없는파일.csv")


# ── 연도 정규화 ─────────────────────────────────────────────────────────
def _counts(rows):
    return pd.DataFrame(rows, columns=["grid1k", "year", "total", "fire"])


def test_2021_계단식_급증을_상대비중으로_흡수한다():
    """분류 정책 단절이라 건수를 그대로 쓰면 2021 이후가 과대평가된다."""
    counts = _counts(
        [("다사4641", 2019, 100, 5), ("다사4641", 2020, 105, 5),
         ("다사4641", 2021, 400, 6), ("다사4641", 2022, 410, 6)]
    )
    totals = yearly_totals(counts)
    assert totals[2021] / totals[2020] > 3
    share = year_share(counts)
    assert abs(sum(share.values()) - 1.0) < 1e-9
    assert share[2021] < 0.5


# ── '활동 있는 침묵' ────────────────────────────────────────────────────
def test_활동있는침묵은_안전과_무관측을_가른다():
    """총신고가 많은데 화재가 0이면 '안전'이 아니라 '무관측' 후보다."""
    counts = _counts(
        [
            ("다사0001", 2023, 80, 0),  # 활동 있는 침묵 ← 승격 후보
            ("다사0002", 2023, 80, 3),  # 화재가 관측됨
            ("다사0003", 2023, 5, 0),  # 활동 자체가 없음 = 판단 보류
        ]
    )
    silent = silent_activity(counts)
    assert list(silent["grid1k"]) == ["다사0001"]


def test_연도가_쪼개져_있어도_격자_단위로_합산한다():
    counts = _counts([("다사0001", 2022, 30, 0), ("다사0001", 2023, 30, 0)])
    assert len(silent_activity(counts, min_total=SILENT_MIN_TOTAL)) == 1  # 60 ≥ 50


def test_격자ID_패턴은_500m_형식만_통과시킨다():
    s = pd.Series(["다사46a41a", "다사4641", "", None], dtype="string")
    assert list(s.str.match(GRID500_PATTERN, na=False)) == [True, False, False, False]
