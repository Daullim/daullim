"""`build_scored()` 프로세스 캐시 — 중복 재계산 제거(이슈 #28)의 회귀 방지.

진짜 계산은 돌리지 않는다(원본 데이터·캐시가 있어야 하고 15초가 든다). 무거운 계산은
`_compute_scored`를 가짜로 바꿔 **몇 번 불렸는지**만 본다 — 여기서 잠글 것은 점수 로직이
아니라 **캐시가 언제 다시 계산하고, 반환값이 서로를 오염시키지 않는가**이다.
"""

from __future__ import annotations

import pandas as pd
import pytest

import run_scoring
from daullim_data.scoring import ScoreParams


def _fake_result(marker: str = "a") -> tuple[pd.DataFrame, ScoreParams]:
    df = pd.DataFrame({"bld_key": ["k1", "k2"], "score": [10.0, 20.0], "marker": [marker, marker]})
    params = ScoreParams(
        version="test", q_lo_value=0.0, q_hi_value=1.0, alpha=1.0,
        m_urban=1.0, m_rural=1.0, lambda_bar_urban=1.0, lambda_bar_rural=1.0,
        beta_age=0.5, beta_struct=0.0,
    )
    return df, params


@pytest.fixture
def counting_compute(monkeypatch):
    """`_compute_scored`를 호출 횟수 세는 가짜로 바꾸고, 캐시를 비운 채 시작한다."""
    calls = {"n": 0}

    def fake():
        calls["n"] += 1
        return _fake_result()

    monkeypatch.setattr(run_scoring, "_compute_scored", fake)
    monkeypatch.setattr(run_scoring, "_SCORED", None)
    return calls


def test_두번째_호출은_다시_계산하지_않는다(counting_compute):
    """run_all.py가 한 프로세스에서 6·7단계를 부르므로 여기서 15초가 절약된다."""
    run_scoring.build_scored()
    run_scoring.build_scored()
    run_scoring.build_scored()
    assert counting_compute["n"] == 1


def test_캐시된_값도_같은_결과를_돌려준다(counting_compute):
    first, first_params = run_scoring.build_scored()
    second, second_params = run_scoring.build_scored()
    pd.testing.assert_frame_equal(first, second)
    assert first_params == second_params


def test_반환값을_변형해도_다음_호출이_오염되지_않는다(counting_compute):
    """가장 위험한 실패 모드 — 앞 단계가 제자리에서 컬럼을 붙이면 뒷 단계가 그걸 물려받는다.

    지금 호출부(`assign_order`·`relative_risk`)는 입력을 copy하지만, 그 규약이 깨져도
    캐시가 원본을 내주지 않아야 한다.
    """
    first, _ = run_scoring.build_scored()
    first["injected"] = 1
    first.loc[0, "score"] = -999.0

    second, _ = run_scoring.build_scored()
    assert "injected" not in second.columns
    assert second.loc[0, "score"] == 10.0


def test_rebuild는_강제로_다시_계산한다(counting_compute):
    run_scoring.build_scored()
    run_scoring.build_scored(rebuild=True)
    assert counting_compute["n"] == 2


def test_rebuild_후에는_새_결과가_캐시된다(monkeypatch):
    """`rebuild=True`가 캐시를 **갱신**하는지 — 계산만 다시 하고 옛 값을 남기면 최악이다."""
    monkeypatch.setattr(run_scoring, "_SCORED", None)

    monkeypatch.setattr(run_scoring, "_compute_scored", lambda: _fake_result("old"))
    assert run_scoring.build_scored()[0]["marker"].iat[0] == "old"

    monkeypatch.setattr(run_scoring, "_compute_scored", lambda: _fake_result("new"))
    assert run_scoring.build_scored(rebuild=True)[0]["marker"].iat[0] == "new"
    # rebuild 없이 다시 불러도 갱신된 값이 나와야 한다
    assert run_scoring.build_scored()[0]["marker"].iat[0] == "new"
