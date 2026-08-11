"""커널 강도 λ̂ — 확정 파라미터와 EB 축소의 성질을 잠근다."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from daullim_data.utils import DataTrapError
from daullim_data.kernel import (
    BANDWIDTH_M,
    prepare_fires,
    CUTOFF_M,
    TAU_YEARS,
    W_DEATH,
    W_INJURY,
    W_PROPERTY,
    _weighted_sum,
    estimate_m,
    gaussian_kernel,
    jaccard,
    lambda_hat,
    severity_weight,
    spread_exposure,
    time_decay,
)


# ── 확정 파라미터 (§2-5) ────────────────────────────────────────────────
def test_확정_파라미터():
    assert (W_DEATH, W_INJURY, W_PROPERTY) == (3.0, 2.0, 1.0)
    assert TAU_YEARS == 3.0 and BANDWIDTH_M == 250.0


def test_심각도_가중():
    """사망 3 · 부상 2 · 재산피해 1."""
    w = severity_weight([1, 0, 0], [0, 1, 0], [0, 0, 5000])
    assert list(w) == [3.0, 2.0, 1.0]


def test_재산피해는_금액이_아니라_발생여부다():
    """금액을 그대로 쓰면 단위가 사람 수를 압도한다."""
    assert list(severity_weight([0, 0], [0, 0], [1000, 900_000_000])) == [1.0, 1.0]


def test_시간감쇠는_3년에_e분의_1():
    assert time_decay(0) == pytest.approx(1.0)
    assert time_decay(365.25 * 3) == pytest.approx(np.exp(-1), rel=1e-6)
    assert time_decay(365.25 * 6) == pytest.approx(np.exp(-2), rel=1e-6)


def test_커널_감쇠는_정의서_값과_맞는다():
    assert gaussian_kernel(0) == pytest.approx(1.0)
    assert gaussian_kernel(250) == pytest.approx(0.607, abs=0.001)  # ≈0.61배
    assert gaussian_kernel(500) == pytest.approx(0.135, abs=0.001)  # ≈0.14배


# ── 버킷팅 최적화의 정확성 ──────────────────────────────────────────────
def test_버킷팅은_근사가_아니라_정확하다():
    """3×3 이웃(±1000m)이 컷오프(750m)를 덮으므로 전수 비교와 같아야 한다."""
    rng = np.random.default_rng(42)
    px, py = rng.uniform(0, 5000, 60), rng.uniform(0, 5000, 60)
    sx, sy = rng.uniform(0, 5000, 200), rng.uniform(0, 5000, 200)
    sw = rng.uniform(1, 10, 200)

    got = _weighted_sum(px, py, sx, sy, sw)
    d2 = (px[:, None] - sx[None, :]) ** 2 + (py[:, None] - sy[None, :]) ** 2
    brute = np.where(d2 <= CUTOFF_M**2, np.exp(-0.5 * d2 / BANDWIDTH_M**2), 0.0) @ sw
    assert np.allclose(got, brute)


def test_소스가_없으면_0이다():
    assert list(_weighted_sum(np.array([0.0]), np.array([0.0]), np.array([]), np.array([]), np.array([]))) == [0.0]


# ── 노출량 분산 ─────────────────────────────────────────────────────────
def test_가구를_셀에_펼쳐도_총량은_보존된다():
    grids = pd.DataFrame({"x_5179": [0.0, 2000.0], "y_5179": [0.0, 0.0], "households": [100.0, 50.0]})
    spread = spread_exposure(grids, per_side=5)
    assert len(spread) == 2 * 25
    assert spread["households"].sum() == pytest.approx(150.0)


def test_펼치면_모서리_노출량_급락이_완화된다():
    """중심 집중 시 셀 모서리(450,450)=636m·K=0.039로 λ̂ 인위적 치솟음 — 가구 분산 배치로 완화."""
    center = pd.DataFrame({"x_5179": [0.0], "y_5179": [0.0], "households": [100.0]})
    corner = (np.array([450.0]), np.array([450.0]))
    lumped = _weighted_sum(*corner, center["x_5179"].to_numpy(), center["y_5179"].to_numpy(),
                           center["households"].to_numpy())
    spread = spread_exposure(center)
    spread_val = _weighted_sum(*corner, spread["x_5179"].to_numpy(), spread["y_5179"].to_numpy(),
                               spread["households"].to_numpy())
    assert spread_val[0] > lumped[0] * 2


# ── EB 축소 m ───────────────────────────────────────────────────────────
def test_이질적이면_m이_작고_균질하면_크다():
    """m = 관측을 prior와 맞먹게 보는 가구수 — 노출량 상수면 P10=P90으로 전값 클립되므로 픽스처에 분산 필수."""
    rng = np.random.default_rng(3)
    e = rng.uniform(50, 500, 400)
    hetero = estimate_m(np.where(np.arange(400) % 2, e * 0.2, 0.0), e)  # 발생률이 0 또는 0.2
    homo = estimate_m(e * 0.1, e)  # 발생률이 전부 0.1
    assert hetero.m < homo.m
    assert homo.clipped.startswith("upper")  # 이질성이 없으면 축소를 최대로


def test_Var가_0이하면_상한으로_클립하고_보고한다():
    """진짜 이질성이 없으면 축소를 세게 — 하지만 조용히 하지 않는다."""
    rng = np.random.default_rng(0)
    e = np.full(300, 50.0)
    est = estimate_m(rng.poisson(1.0, 300), e)
    if est.variance <= 0:
        assert est.clipped.startswith("upper") and "P90" in est.render()


def test_클립되면_render에_이유가_남는다():
    e = np.full(100, 10.0)
    est = estimate_m(np.zeros(100), e)  # 사건이 없으면 λ̄=0 → Var≤0
    assert est.clipped == "upper_var"
    assert "P90" in est.render()


def test_w_sev를_m_추정에_섞으면_축소가_약해진다():
    """가중 합은 과산포로 V̂ar를 부풀려 m을 축소 → '소규모 급증 지역 1등 방지' 목적과 정반대로 작동."""
    rng = np.random.default_rng(7)
    e = rng.uniform(50, 500, 600)
    raw = rng.poisson(e * 0.01).astype(float)
    weighted = raw * 3.0  # 사망 가중이 붙은 것처럼 — 같은 사건인데 분산만 9배
    assert estimate_m(weighted, e).m < estimate_m(raw, e).m


def test_유효셀이_부족하면_죽는다():
    with pytest.raises(ValueError):
        estimate_m([1.0], [10.0])


# ── λ̂ 산출 ─────────────────────────────────────────────────────────────
def _pt(x, y):
    return pd.DataFrame({"x_5179": [float(x)], "y_5179": [float(y)]})


def test_노출이_작으면_원시_발생률이_평균쪽으로_당겨진다():
    """소표본 스파이크 억제 — 노출↓ → Z=E/(E+m)↓로 λ̄ 쪽 축소, 급증 소규모 지역 1등 방지 목적."""
    lam_bar, m = 0.001, 100.0
    rate = 0.05  # 두 경우 모두 원시 발생률은 같다

    def lam(households: float) -> float:
        # 노출량에 비례한 사건 강도를 같은 지점에 얹어 S/E를 고정한다.
        exp_df = pd.DataFrame({"x_5179": [0.0], "y_5179": [0.0], "households": [households]})
        e_i = lambda_hat(_pt(0, 0), pd.DataFrame(columns=["x_5179", "y_5179", "weight"]),
                         exp_df, m=m, lambda_bar=lam_bar)["exposure"].iat[0]
        fires = pd.DataFrame({"x_5179": [0.0], "y_5179": [0.0], "weight": [rate * e_i]})
        return lambda_hat(_pt(0, 0), fires, exp_df, m=m, lambda_bar=lam_bar)["lambda_hat"].iat[0]

    small, large = lam(5.0), lam(50_000.0)
    assert abs(small - lam_bar) < abs(large - lam_bar)
    assert large == pytest.approx(rate, rel=0.05)  # 노출이 크면 실측이 지배한다


def test_같은_격자_안의_두_점이_다른_값을_받는다():
    """격자 내 동점 소멸 — 이 항이 존재하는 이유 그 자체."""
    fires = pd.DataFrame({"x_5179": [100.0], "y_5179": [100.0], "weight": [3.0]})
    exp = pd.DataFrame({"x_5179": [500.0], "y_5179": [500.0], "households": [100.0]})
    near = lambda_hat(_pt(150, 150), fires, exp, m=10, lambda_bar=0.001)["lambda_hat"].iat[0]
    far = lambda_hat(_pt(850, 850), fires, exp, m=10, lambda_bar=0.001)["lambda_hat"].iat[0]
    assert near != far and near > far


def test_분자는_주거_화재만_쓴다():
    """재론 확정(2026-08-04) — 주거는 화재의 22~40%인데 사망의 60~79%다."""
    fires = pd.DataFrame(
        {
            "x_5179": [0.0, 10.0],
            "y_5179": [0.0, 10.0],
            "is_residential": [True, False],
            "DCSD_CNT": [0, 0],
            "INJPSN_CNT": [0, 0],
            "PRPT_DAM_AMT": [1000, 1000],
            "occurred": pd.to_datetime(["2023-06-01", "2023-06-01"]),
        }
    )
    ref = pd.Timestamp("2023-12-31")
    assert len(prepare_fires(fires, reference_day=ref)) == 1
    assert len(prepare_fires(fires, reference_day=ref, residential_only=False)) == 2


def test_주거_판별_컬럼이_없으면_죽는다():
    """load_fires를 경유하지 않은 프레임을 조용히 통과시키지 않는다."""
    bad = pd.DataFrame(
        {"x_5179": [0.0], "y_5179": [0.0], "DCSD_CNT": [0], "INJPSN_CNT": [0],
         "PRPT_DAM_AMT": [0], "occurred": pd.to_datetime(["2023-06-01"])}
    )
    with pytest.raises(DataTrapError, match="is_residential"):
        prepare_fires(bad, reference_day=pd.Timestamp("2023-12-31"))


def test_먼_화재는_영향을_주지_않는다():
    """컷오프 밖(3σ=750m)은 계산에서 빠진다 — K < 1e-4."""
    far_fire = pd.DataFrame({"x_5179": [5000.0], "y_5179": [0.0], "weight": [100.0]})
    exp = pd.DataFrame({"x_5179": [0.0], "y_5179": [0.0], "households": [100.0]})
    out = lambda_hat(_pt(0, 0), far_fire, exp, m=10, lambda_bar=0.001)
    assert out["intensity"].iat[0] == 0.0


# ── 민감도 보고 ─────────────────────────────────────────────────────────
def test_자카드():
    assert jaccard([1, 2, 3], [1, 2, 3]) == 1.0
    assert jaccard([1, 2], [3, 4]) == 0.0
    assert jaccard([1, 2, 3], [2, 3, 4]) == pytest.approx(0.5)
