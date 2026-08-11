"""점수·순위 — 정규화·구간화·타이브레이커·G2 쿼터를 잠근다."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from daullim_data.scoring import (
    DANGER_MIN,
    EXPLORE_FRACTION,
    Q_HI,
    Q_LO,
    RURAL_ELDERLY_MIN,
    RURAL_NONAPT_MIN,
    RX_UNSUPPLIED,
    WARN_MIN,
    assign_order,
    basis_text,
    morton_key,
    normalize_score,
    raw_score,
    risk_level,
    rural_target,
    rx_code,
)


# ── 확정 파라미터 (§2-5) ────────────────────────────────────────────────
def test_확정_임계값():
    assert (DANGER_MIN, WARN_MIN) == (70.0, 35.0)
    assert (Q_LO, Q_HI) == (0.01, 0.99)
    assert (RURAL_NONAPT_MIN, RURAL_ELDERLY_MIN) == (0.8, 0.4)
    assert 0.05 <= EXPLORE_FRACTION <= 0.10


def test_세_항은_곱이다():
    r = raw_score([2.0], [1.5], [3.0])
    assert r.iat[0] == pytest.approx(9.0)


# ── 정규화 ──────────────────────────────────────────────────────────────
def test_로그정규화가_꼬리를_눌러_변별을_살린다():
    """단순 min-max면 상위 1~2개가 100을 먹고 나머지가 0~5에 몰린다."""
    # 곱 구조 + 두꺼운 꼬리 → Score_raw는 로그정규에 가깝다(§2-5)
    rng = np.random.default_rng(0)
    raw = pd.Series(np.exp(rng.normal(-8, 1.5, 2000)))
    score, _, _ = normalize_score(raw)
    plain = (raw - raw.min()) / (raw.max() - raw.min()) * 100
    assert plain.median() < 1.0  # 단순 min-max는 중앙값이 바닥에 붙는다
    assert 30 < score.median() < 70  # 로그는 분포를 펴 화면 변별을 살린다


def test_q01_q99_클리핑으로_극단값이_스케일을_지배하지_못한다():
    raw = pd.Series(list(np.linspace(1, 100, 99)) + [1e12])
    score, lo, hi = normalize_score(raw)
    assert score.max() == 100.0 and score.min() == 0.0
    assert hi < np.log(1e12)  # 극단값이 상한을 끌고 가지 않았다


def test_순서를_보존한다():
    raw = pd.Series([0.1, 1.0, 10.0, 100.0])
    score, _, _ = normalize_score(raw)
    assert list(score) == sorted(score)


def test_raw가_0이어도_죽지_않는다():
    """주변 화재 이력이 전혀 없는 건물 — ln(0)=-inf를 바닥으로 막는다."""
    score, _, _ = normalize_score(pd.Series([0.0, 1.0, 2.0]))
    assert score.notna().all() and score.between(0, 100).all()


def test_분포가_한_점이면_전원_중앙값():
    score, _, _ = normalize_score(pd.Series([5.0] * 10))
    assert (score == 50.0).all()


# ── 구간화 ──────────────────────────────────────────────────────────────
def test_risk_level은_절대_임계값이다():
    """분위수 기준이면 화면에 항상 일정 비율이 빨간색으로 남아 개선 여부 확인 불가 — 기획서 §5-1 위반이라 절대 임계값 사용."""
    assert list(risk_level(pd.Series([100, 70, 69.9, 35, 34.9, 0]))) == [
        "danger", "danger", "warn", "warn", "ok", "ok",
    ]


def test_전원이_안전해지면_danger가_0이_된다():
    """절대 임계값이어야 개선이 측정된다."""
    assert (risk_level(pd.Series([10.0] * 100)) == "ok").all()


# ── 동선 (타이브레이커 3단) ─────────────────────────────────────────────
def test_Z_order는_공간_근접성을_순서에_보존한다():
    x = np.array([0.0, 100.0, 0.0, 10_000.0])
    y = np.array([0.0, 0.0, 100.0, 10_000.0])
    k = morton_key(x, y)
    near = max(k[:3]) - min(k[:3])
    assert k.iat[3] - max(k[:3]) > near  # 먼 점은 순서에서도 멀다


# ── 농촌 분기 ───────────────────────────────────────────────────────────
def test_농촌_절대필터는_두_조건_모두다():
    t = rural_target([0.9, 0.9, 0.7, 0.7], [0.5, 0.3, 0.5, 0.3])
    assert list(t) == [True, False, False, False]


# ── 순위·쿼터 ───────────────────────────────────────────────────────────
def _bld(n, scores=None, ages=None):
    return pd.DataFrame({
        "bld_key": [f"B{i}" for i in range(n)],
        "score": scores if scores is not None else np.linspace(100, 0, n),
        "use_apr_day": ages if ages is not None else ["20000101"] * n,
        "x_5179": np.linspace(0, 1000, n),
        "y_5179": np.linspace(0, 1000, n),
        "algo_class": ["URBAN"] * n,
    })


def test_order_key는_1부터_N까지_유일_연속():
    o, rep = assign_order(_bld(50))
    assert list(o["order_key"]) == list(range(1, 51))
    assert rep.total == 50


def test_score가_1순위_정렬키다():
    o, _ = assign_order(_bld(5, scores=[10, 90, 50, 70, 30]))
    assert list(o["score"]) == [90, 70, 50, 30, 10]


def test_동점이면_연차가_오래된_쪽이_앞이다():
    """§2-3 2단=원래 만료확률이나 보급이력 전량 NULL로 무력화 — 대리로 연차(만료확률과 같은 방향) 사용."""
    b = _bld(3, scores=[50, 50, 50], ages=["20200101", "19700101", "20100101"])
    o, rep = assign_order(b)
    assert list(o["use_apr_day"]) == ["19700101", "20100101", "20200101"]
    assert "도시 2단=연차" in rep.render()


def test_연차_결측은_맨_뒤로_간다():
    """결측=0이면 실제 날짜(-738,000 근처)보다 커 DESC 정렬 1등 — 임실군 실측서 큐 상위 5건 전부 결측이었던 버그 재현 방지."""
    b = _bld(3, scores=[50, 50, 50], ages=[None, "20200101", "19700101"])
    o, _ = assign_order(b)
    got = list(o["use_apr_day"])
    assert got[:2] == ["19700101", "20200101"]
    assert pd.isna(got[2])


def test_블록이_정렬보다_먼저다():
    """농촌 절대필터 통과분은 score가 낮아도 도시보다 앞에 온다(§2-2)."""
    b = _bld(4, scores=[90, 10, 80, 20])
    b["algo_class"] = ["URBAN", "RURAL", "URBAN", "RURAL"]
    b["rural_target"] = [False, True, False, False]
    o, rep = assign_order(b)
    assert list(o["algo_class"]) == ["RURAL", "URBAN", "URBAN", "RURAL"]
    assert list(o["score"]) == [10, 90, 80, 20]  # 블록 안에서만 score 정렬
    assert rep.blocks == {0: 1, 1: 2, 2: 1}


def test_농촌대상_블록은_사용승인일이_오래된_순이다():
    """보급연차↓가 원래 1순위인데 보급이력이 전량 NULL이라 사용승인일↑로 대리한다."""
    b = _bld(3, scores=[10, 90, 50], ages=["20200101", "19800101", "20000101"])
    b["algo_class"] = ["RURAL"] * 3
    b["rural_target"] = [True] * 3
    o, _ = assign_order(b)
    assert list(o["use_apr_day"]) == ["19800101", "20000101", "20200101"]


def test_농촌대상_동률이면_1인가구율이_높은_쪽이_앞이다():
    b = _bld(2, scores=[50, 50], ages=["20000101", "20000101"])
    b["algo_class"] = ["RURAL"] * 2
    b["rural_target"] = [True] * 2
    b["single_ratio"] = [0.2, 0.8]
    o, _ = assign_order(b)
    assert list(o["single_ratio"]) == [0.8, 0.2]


def test_탐사쿼터는_5에서_10퍼센트다():
    """G2 — 큐로 뽑힌 가구에서만 회신이 쌓이면 재학습이 자기 선택 편향에 갇힌다."""
    o, rep = assign_order(_bld(1000))
    assert 0.05 <= o["is_explore"].mean() <= 0.10
    assert rep.explore == int(o["is_explore"].sum())


def test_탐사쿼터는_시드로_재현된다():
    a, _ = assign_order(_bld(500), rng_seed=7)
    b, _ = assign_order(_bld(500), rng_seed=7)
    assert list(a["is_explore"]) == list(b["is_explore"])


def test_탐사쿼터는_무작위_배정이라_상위에_쏠리지_않는다():
    o, _ = assign_order(_bld(2000))
    top_rate = o.nsmallest(200, "order_key")["is_explore"].mean()
    assert 0.0 < top_rate < 0.25  # 전량 상위/하위 배정이 아님


# ── basis · rx ──────────────────────────────────────────────────────────
def test_basis는_미보급_포맷이다():
    """보급이력이 전량 NULL이므로 '미보급'을 그대로 적는다(확정 결정 2)."""
    assert list(basis_text(pd.Series([1, 42]))) == ["미보급 · 동선 1", "미보급 · 동선 42"]
    assert basis_text(pd.Series([999999])).str.len().max() <= 100


def test_rx는_전량_RX_IOT다():
    """미보급이면 전지 교체가 무의미하다 — 기기 설치로 간다."""
    assert set(rx_code(5)) == {RX_UNSUPPLIED} == {"RX-IOT"}
