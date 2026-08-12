"""pairwise LTR — 학습 규약과 소표본 방어를 잠근다."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from daullim_data.ltr import (
    FEATURES,
    capture_rate,
    exposure_confound_audit,
    fit_pairwise,
    fit_with_ci,
    make_pairs,
)


def _df(n_grid=6, per_grid=40, seed=0, signal=1.0):
    """x1_age가 클수록 양성이 되는 합성 데이터."""
    rng = np.random.default_rng(seed)
    rows = []
    for g in range(n_grid):
        x1 = rng.uniform(0, 2, per_grid)
        p = 1 / (1 + np.exp(-(signal * (x1 - 1))))
        rows.append(pd.DataFrame({
            "grid1k": f"G{g}", "x1_age": x1,
            "x2_struct": rng.integers(0, 2, per_grid).astype(float),
            "x3_prior": rng.normal(0, 0.3, per_grid),
            "label": rng.random(per_grid) < p,
        }))
    return pd.concat(rows, ignore_index=True)


# ── 쌍 만들기 ───────────────────────────────────────────────────────────
def test_쌍은_같은_격자_안에서만_만든다():
    """격자 밖 쌍을 쓰면 ①λ̂·②V⊥가 상쇄되지 않아 β에 다른 항의 신호가 섞인다."""
    df = pd.DataFrame({
        "grid1k": ["A", "A", "B", "B"],
        "x1_age": [1.0, 0.0, 5.0, 0.0], "x2_struct": [0.0] * 4, "x3_prior": [0.0] * 4,
        "label": [True, False, False, False],
    })
    delta, owners = make_pairs(df, label="label", group="grid1k", rng=np.random.default_rng(0))
    assert len(delta) == 1  # A격자의 (양성, 음성) 한 쌍만
    assert delta[0][0] == pytest.approx(1.0)


def test_양성이나_음성이_없는_격자는_건너뛴다():
    df = pd.DataFrame({
        "grid1k": ["A", "A"], "x1_age": [1.0, 2.0], "x2_struct": [0.0] * 2,
        "x3_prior": [0.0] * 2, "label": [False, False],
    })
    delta, _ = make_pairs(df, label="label", group="grid1k", rng=np.random.default_rng(0))
    assert len(delta) == 0


def test_음성_표집에_상한이_있다():
    df = pd.DataFrame({
        "grid1k": ["A"] * 101, "x1_age": [1.0] + [0.0] * 100,
        "x2_struct": [0.0] * 101, "x3_prior": [0.0] * 101,
        "label": [True] + [False] * 100,
    })
    delta, _ = make_pairs(df, label="label", group="grid1k", rng=np.random.default_rng(0), max_neg=20)
    assert len(delta) == 20


# ── 학습 ────────────────────────────────────────────────────────────────
def test_신호가_있으면_부호를_맞힌다():
    df = _df(signal=3.0)
    res = fit_with_ci(df, label="label", group="grid1k", n_boot=60)
    assert res.beta[0] > 0  # x1_age가 클수록 양성
    assert res.significant[0]


def test_신호가_없으면_CI가_0을_포함한다():
    """노이즈를 계수로 굳히지 않는다 — 채택 판정의 근거."""
    df = _df(signal=0.0, seed=3)
    res = fit_with_ci(df, label="label", group="grid1k", n_boot=60)
    assert not res.significant[0]


def test_쌍이_없으면_0을_돌려주고_사유를_남긴다():
    df = pd.DataFrame({
        "grid1k": ["A"], "x1_age": [1.0], "x2_struct": [0.0], "x3_prior": [0.0], "label": [False],
    })
    res = fit_with_ci(df, label="label", group="grid1k", n_boot=5)
    assert (res.beta == 0).all() and res.n_pairs == 0
    assert "학습 쌍을 만들 수 없다" in res.notes[0]


def test_L2가_없으면_계수가_발산한다():
    """표본이 작아 분리 가능하면 규제 없이는 한 방향으로 커진다."""
    delta = np.array([[1.0, 0.0, 0.0]] * 50)
    weak = fit_pairwise(delta, l2=1.0)
    none = fit_pairwise(delta, l2=0.0)
    assert abs(none[0]) > abs(weak[0])


def test_부트스트랩_재표집_단위는_양성이다():
    """쌍을 재표집하면 표본이 커 보여 신뢰구간이 거짓으로 좁아진다."""
    df = _df(signal=1.0)
    a = fit_with_ci(df, label="label", group="grid1k", n_boot=80, seed=1)
    width = a.ci_hi[0] - a.ci_lo[0]
    assert width > 0  # 구간이 실제로 열려 있다
    assert a.n_pairs > a.n_positive  # 쌍이 양성보다 많은데도


def test_특징_순서가_고정이다():
    assert FEATURES == ("x1_age", "x2_struct", "x3_prior")


# ── 포집률 ──────────────────────────────────────────────────────────────
def test_포집률():
    df = pd.DataFrame({"s": [10, 9, 8, 7, 6, 5, 4, 3, 2, 1], "y": [True] + [False] * 9})
    assert capture_rate(df, "s", "y", frac=0.10) == pytest.approx(100.0)
    assert capture_rate(df, "s", "y", frac=0.10) >= capture_rate(
        df.assign(s=df["s"][::-1].values), "s", "y", frac=0.10
    )


def test_라벨이_없으면_NaN():
    df = pd.DataFrame({"s": [1.0, 2.0], "y": [False, False]})
    assert np.isnan(capture_rate(df, "s", "y"))


# ── 노출량 교란 게이트 ──────────────────────────────────────────────────
# 2026-08-11에 실제로 뚫린 함정을 그대로 재현한다. 전체 중앙값만 보던 게이트가
# 지역 혼합이 바뀌자 통과해 버렸고, 그 결과 교란된 계수가 채택 판정을 받았다.
def _confound_frame(rows: list[tuple[str, bool, float]]) -> pd.DataFrame:
    return pd.DataFrame(rows, columns=["sido", "fire_label", "unit_count"])


def test_교란이_없으면_통과한다():
    rows = [("A", i < 20, 3.0) for i in range(200)]
    audit = exposure_confound_audit(_confound_frame(rows), label="fire_label", scope_col="sido")
    assert not audit.confounded


def test_전체_중앙값이_가려도_시도별로_잡는다():
    """이 테스트가 이 게이트의 존재 이유다.

    A 지역은 양성 세대수가 음성의 5배(명백한 교란)인데, 단독주택뿐인 B 지역을 대량으로
    섞으면 **전체 중앙값 배율이 1.0**이 되어 옛 게이트를 통과한다.
    """
    rows = [("A", True, 5.0)] * 30 + [("A", False, 1.0)] * 300
    rows += [("B", True, 1.0)] * 60 + [("B", False, 1.0)] * 600
    df = _confound_frame(rows)

    # 옛 게이트가 보던 값 — 전체 중앙값만으로는 안 걸린다
    pos, neg = df.loc[df["fire_label"], "unit_count"], df.loc[~df["fire_label"], "unit_count"]
    assert pos.median() / neg.median() < 2.0

    assert exposure_confound_audit(df, label="fire_label", scope_col="sido").confounded


def test_시도를_안_주면_전체만_본다():
    """`scope_col` 없이는 부분집합을 만들지 않는다 — 지역별 교란을 놓칠 수 있는 호출이다."""
    rows = [("A", True, 5.0)] * 30 + [("A", False, 1.0)] * 300
    rows += [("B", True, 1.0)] * 60 + [("B", False, 1.0)] * 600
    df = _confound_frame(rows)
    audit = exposure_confound_audit(df, label="fire_label")
    assert {c.scope for c in audit.checks} == {"전체"}

    # 같은 데이터에 시도를 주면 A 지역의 중앙배율 5.0이 추가로 드러난다
    scoped = exposure_confound_audit(df, label="fire_label", scope_col="sido")
    assert {c.scope for c in scoped.checks} == {"전체", "A", "B"}
    assert any(c.scope == "A" and c.statistic == "중앙" and c.flagged for c in scoped.checks)


def test_평균이_튀면_중앙값이_같아도_잡는다():
    """전북 케이스 — 중앙 1.0 대 1.0인데 평균은 5.19배였다."""
    rows = [("A", True, 1.0)] * 18 + [("A", True, 60.0)] * 2
    rows += [("A", False, 1.0)] * 400
    audit = exposure_confound_audit(_confound_frame(rows), label="fire_label")
    assert audit.confounded
    assert any(c.statistic == "평균" and c.flagged for c in audit.checks)


def test_양성이_적은_부분집합은_판정에서_뺀다():
    """배율이 노이즈인 구간까지 세면 아무 학습도 통과하지 못한다."""
    rows = [("A", i < 3, 50.0 if i < 3 else 1.0) for i in range(300)]
    audit = exposure_confound_audit(_confound_frame(rows), label="fire_label", scope_col="sido")
    assert all(c.n_positive >= 10 for c in audit.checks)
