"""도농 판별 결정 트리 — 정의서 §2-2의 임계값과 대조 규약을 잠근다."""

from __future__ import annotations

import pandas as pd
import pytest

from daullim_data.region_type import (
    BUFFER,
    BUFFER_APT_RATIO,
    BUFFER_DISPATCH_SEC,
    DENSITY_RURAL,
    DENSITY_URBAN,
    NO_POP,
    RURAL,
    URBAN,
    agreement,
    classify,
    classify_row,
    dispatch_monotonicity,
    is_monotonic,
    promote_no_pop,
)


# ── 확정 파라미터 (§2-5) ────────────────────────────────────────────────
def test_임계값은_DEGURBA_준용값이다():
    assert (DENSITY_URBAN, DENSITY_RURAL) == (1500, 300)
    assert (BUFFER_APT_RATIO, BUFFER_DISPATCH_SEC) == (0.5, 420)


# ── 결정 트리 ───────────────────────────────────────────────────────────
@pytest.mark.parametrize(
    "pop,expected",
    [(0, NO_POP), (1500, URBAN), (5000, URBAN), (299, RURAL), (1, RURAL)],
)
def test_밀도만으로_갈리는_구간(pop, expected):
    stored, algo = classify_row(pop, apt_ratio=0.1, dispatch_sec=9999)
    assert stored == expected and algo == expected


def test_완충대는_저장값과_알고리즘_클래스가_다르다():
    """확정 결정 6 — 저장은 BUFFER를 보존하고, 알고리즘은 2분한다."""
    stored, algo = classify_row(800, apt_ratio=0.9, dispatch_sec=9999)
    assert (stored, algo) == (BUFFER, URBAN)  # 아파트율로 도시
    stored, algo = classify_row(800, apt_ratio=0.1, dispatch_sec=300)
    assert (stored, algo) == (BUFFER, URBAN)  # 출동소요로 도시
    stored, algo = classify_row(800, apt_ratio=0.1, dispatch_sec=9999)
    assert (stored, algo) == (BUFFER, RURAL)


def test_완충대_타이브레이크는_OR다():
    """아파트율 '또는' 출동소요 — 둘 중 하나만 충족해도 URBAN."""
    assert classify_row(800, 0.5, 9999)[1] == URBAN
    assert classify_row(800, 0.49, 419)[1] == URBAN
    assert classify_row(800, 0.49, 420)[1] == RURAL  # 경계값은 미만이어야 도시


def test_출동소요가_없으면_아파트율만_본다():
    """화재 이력이 없는 격자엔 R이 없다 — 없는 근거를 있는 척 쓰지 않는다."""
    assert classify_row(800, 0.9, None)[1] == URBAN
    assert classify_row(800, 0.1, None)[1] == RURAL
    assert classify_row(800, None, None)[1] == RURAL


def test_인구_결측은_NO_POP이다():
    assert classify_row(pd.NA, 0.9, 100)[0] == NO_POP


# ── 프레임 단위 ─────────────────────────────────────────────────────────
def _grids(rows):
    return pd.DataFrame(rows, columns=["grid1k", "pop", "apt_ratio", "nonapt_ratio", "dispatch_sec"])


def test_MIXED는_완충대_안에서만_선다():
    """도농 복합 — 자동 처방 대신 가구 확인 우선 표식."""
    g = classify(
        _grids(
            [
                ("A", 800, 0.5, 0.5, None),  # 완충대 + 비아파트 0.3~0.7 → MIXED
                ("B", 5000, 0.5, 0.5, None),  # 도시라 MIXED 아님
                ("C", 800, 0.9, 0.1, None),  # 완충대지만 비아파트 낮음
            ]
        )
    )
    assert list(g["is_mixed"]) == [True, False, False]


def test_NO_POP_승격은_주거화재가_있을_때만():
    """P=0 ∧ 주거화재>0 → 비정형 주거 확인 큐. 주거화재 0이면 임야·공장으로 보고 제외."""
    g = classify(_grids([("A", 0, None, None, None), ("B", 0, None, None, None)]))
    out = promote_no_pop(g, pd.Series({"A": 2, "B": 0}))
    assert list(out["no_pop_promoted"]) == [True, False]


# ── 대조 규약 (v0 성적표) ───────────────────────────────────────────────
def _labeled(rows):
    return pd.DataFrame(rows, columns=["region_type_cd", "platform_label"])


def test_일치도는_판별_기준_분모다():
    """정의서 879/925·985/1236은 판별 기준(행 방향) — 플랫폼 기준(열 방향)이면 다른 수(2026-08-04 실측 확정)."""
    rep = agreement(
        _labeled(
            [(URBAN, "도시")] * 9 + [(URBAN, "농촌")] + [(RURAL, "농촌")] * 8 + [(RURAL, "도시")] * 2
        )
    )
    assert rep.urban_pct == 90.0 and rep.urban_n == 10  # 9/10, 열 방향이면 9/11
    assert rep.rural_pct == 80.0 and rep.rural_n == 10


def test_BUFFER와_NO_POP은_대조에서_빠진다():
    rep = agreement(
        _labeled([(URBAN, "도시"), (BUFFER, "농촌"), (NO_POP, "농촌"), (RURAL, "농촌")])
    )
    assert rep.urban_n == 1 and rep.rural_n == 1


def test_RURAL_하한은_79_5다():
    """정의서의 'RURAL 80%'는 79.7%의 반올림값이다."""
    rep = agreement(_labeled([(URBAN, "도시")] * 20 + [(RURAL, "농촌")] * 797 + [(RURAL, "도시")] * 203))
    assert round(rep.rural_pct, 1) == 79.7
    assert rep.passed()


# ── 단조성 ──────────────────────────────────────────────────────────────
def test_출동소요_단조성():
    df = pd.DataFrame(
        {
            "region_type_cd": [URBAN, BUFFER, RURAL, NO_POP],
            "dispatch_sec": [360, 480, 720, 810],
        }
    )
    stats = dispatch_monotonicity(df)
    assert list(stats.index) == [URBAN, BUFFER, RURAL, NO_POP]  # 순서가 고정된다
    assert is_monotonic(stats)


def test_역전되면_단조성_미달():
    df = pd.DataFrame(
        {"region_type_cd": [URBAN, BUFFER, RURAL], "dispatch_sec": [360, 900, 720]}
    )
    assert not is_monotonic(dispatch_monotonicity(df))
