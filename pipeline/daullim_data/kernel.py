"""① 시공간 커널 이력 강도 λ̂ — 경험적 베이즈 축소.

    λ̂_i = [ Σ_j w_sev(j)·e^(−Δt_j/τ)·K_b(d(i,j))  +  m·λ̄_class ] / (E_i + m)

이 항이 존재하는 이유는 **커널이 격자 경계를 모른다**는 것이다. 모든 지점이 자기 좌표에서
연속 강도값을 받으므로 '격자 내 동점'이 정의상 소멸한다 — 격자 전용 모델의 블록 내
조건부 AUC가 0.5로 고정되던 P0 결함은 데이터가 아니라 수식 설계의 문제였다.

분모의 축소항은 소표본 스파이크 억제다. 노출이 작으면 m이 분모를 지배해 값이 클래스 평균으로
끌려가고, 노출이 크면 실측이 지배한다. 한 건 터진 소규모 지역이 1등으로 튀는 것을 막는다.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from .utils import DataTrapError

# §2-5 확정 파라미터 — 묻지 말고 그대로 쓴다.
W_DEATH, W_INJURY, W_PROPERTY = 3.0, 2.0, 1.0
TAU_YEARS = 3.0
BANDWIDTH_M = 250.0
# 가우시안 커널은 꼬리가 얇다. 3σ 밖은 K < 0.0001이라 계산에서 잘라도 결과가 바뀌지 않는다.
CUTOFF_M = 3.0 * BANDWIDTH_M


def severity_weight(deaths, injuries, property_damage) -> np.ndarray:
    """w_sev — 사망 3 · 부상 2 · 재산피해 1.

    '불이 잦은 곳'과 '사람이 죽는 곳'은 다른 좌표다. P1에서 빈도 모델이 화재는 33~39%를
    잡으면서 사망은 10~25%밖에 못 잡은 실측이 이 가중의 근거다.
    재산피해는 금액이 아니라 **발생 여부**로 센다 — 금액을 그대로 쓰면 단위가 사람 수를 압도한다.
    """
    d = np.nan_to_num(np.asarray(deaths, dtype=float))
    i = np.nan_to_num(np.asarray(injuries, dtype=float))
    p = np.nan_to_num(np.asarray(property_damage, dtype=float))
    return W_DEATH * d + W_INJURY * i + W_PROPERTY * (p > 0).astype(float)


def time_decay(days_ago, *, tau_years: float = TAU_YEARS) -> np.ndarray:
    """e^(−Δt/τ). 3년 전 화재는 약 0.37배, 6년 전은 0.14배 — 동네는 변한다."""
    years = np.asarray(days_ago, dtype=float) / 365.25
    return np.exp(-np.maximum(years, 0.0) / tau_years)


def gaussian_kernel(dist_m, *, bandwidth: float = BANDWIDTH_M) -> np.ndarray:
    """K_b — 250m 떨어진 화재 ≈ 0.61배, 500m ≈ 0.14배."""
    d = np.asarray(dist_m, dtype=float)
    return np.exp(-0.5 * (d / bandwidth) ** 2)


# ── 경험적 베이즈 축소의 m ──────────────────────────────────────────────
@dataclass(frozen=True)
class MomentEstimate:
    """Clayton–Kaldor 모멘트 추정 결과. 클립 여부를 반드시 함께 보고한다."""

    m: float
    lambda_bar: float
    variance: float
    # None | "upper_var"(Var≤0=이질성 없음) | "upper_cap"(m>P90) | "lower"(Var 과대)
    # 상한 두 경우는 원인이 다르므로 뭉치지 않는다 — 어느 쪽이 걸렸는지 알아야 진단이 된다.
    clipped: str | None
    n_cells: int

    @property
    def is_clipped(self) -> bool:
        return self.clipped is not None

    def render(self) -> str:
        note = {
            "upper_var": " ← Var≤0(이질성 없음), P90 상한",
            "upper_cap": " ← m>P90, 상한 적용",
            "lower": " ← Var 과대(축소 꺼짐 방지), P10 하한",
        }.get(self.clipped, "")
        return (
            f"m={self.m:,.1f} · λ̄={self.lambda_bar:.6f} · "
            f"Var={self.variance:.3e} · n={self.n_cells:,}{note}"
        )


def estimate_m(counts, exposure) -> MomentEstimate:
    """m = λ̄ / V̂ar(λ) — Poisson-Gamma 모멘트 추정(질병지도 표준형).

        λ̄ = ΣS/ΣE ,  r_i = S_i/E_i
        V̂ar = [ Σ E_i(r_i−λ̄)² − (N−1)λ̄ ] / [ ΣE − ΣE²/ΣE ]

    분자의 −(N−1)λ̄가 Poisson 노이즈를 빼낸다. 관측 산포에서 우연한 흔들림을 제거하고
    진짜 지역 간 이질성만 남긴다. 이질적이면 m이 작아 축소를 덜 하고, 균질하면 m이 커
    평균으로 강하게 당긴다.

    ⚠️ **counts는 w_sev 없는 순수 사건 수를 넣어라.** 가중 합은 과산포라 V̂ar를 부풀려
    m을 작게 만들고, 그러면 축소가 약해져 "한 건 터진 소규모 지역이 1등으로 튀는 것을
    막는다"는 목적과 정반대가 된다. m은 '발생률이 얼마나 이질적인가'만 재고,
    w_sev는 '어떤 사건을 더 무겁게 볼 것인가'라는 별개 역할로 남는다.
    """
    s = np.asarray(counts, dtype=float)
    e = np.asarray(exposure, dtype=float)
    ok = np.isfinite(s) & np.isfinite(e) & (e > 0)
    s, e = s[ok], e[ok]
    n = len(s)
    if n < 2 or e.sum() <= 0:
        raise ValueError("m 추정에 필요한 유효 셀이 부족하다")

    lambda_bar = float(s.sum() / e.sum())
    lo, hi = float(np.percentile(e, 10)), float(np.percentile(e, 90))

    r = s / e
    denom = e.sum() - (e**2).sum() / e.sum()
    variance = float((np.sum(e * (r - lambda_bar) ** 2) - (n - 1) * lambda_bar) / denom)

    if variance <= 0:
        # 관측 산포가 Poisson 노이즈를 넘지 못한다 = 진짜 이질성 없음 → 축소를 세게.
        return MomentEstimate(hi, lambda_bar, variance, "upper_var", n)
    m = lambda_bar / variance
    if m < lo:
        # m→0이면 축소가 사실상 꺼진다 — 아예 끄는 것만은 막는다.
        return MomentEstimate(lo, lambda_bar, variance, "lower", n)
    if m > hi:
        return MomentEstimate(hi, lambda_bar, variance, "upper_cap", n)
    return MomentEstimate(float(m), lambda_bar, variance, None, n)


# ── λ̂ 산출 ─────────────────────────────────────────────────────────────
_BUCKET_M = 1000  # 버킷 한 변. 3×3 이웃(±1000m)이 컷오프 750m를 완전히 덮는다.


def _bucket(x: np.ndarray, y: np.ndarray) -> np.ndarray:
    return np.stack([np.floor(x / _BUCKET_M), np.floor(y / _BUCKET_M)], axis=1).astype(np.int64)


def _weighted_sum(
    px: np.ndarray, py: np.ndarray, sx: np.ndarray, sy: np.ndarray, sw: np.ndarray
) -> np.ndarray:
    """Σ_j w_j · K_b(d(점 i, 소스 j)) — 점 × 소스 커널 가중 합.

    소스를 1km 버킷에 담고 점마다 3×3 이웃만 훑는다. 컷오프(3σ=750m)가 이웃 반경보다
    작으므로 **근사가 아니라 정확한 계산**이면서 전수 비교의 비용을 피한다.
    """
    out = np.zeros(len(px), dtype=float)
    if len(sx) == 0:
        return out

    sb = _bucket(sx, sy)
    order = np.lexsort((sb[:, 1], sb[:, 0]))
    sb, sx, sy, sw = sb[order], sx[order], sy[order], sw[order]
    keys, starts = np.unique(sb, axis=0, return_index=True)
    ends = np.append(starts[1:], len(sx))
    index = {(int(k[0]), int(k[1])): (s, e) for k, s, e in zip(keys, starts, ends)}

    pb = _bucket(px, py)
    for i in range(len(px)):
        bx, by = int(pb[i, 0]), int(pb[i, 1])
        total = 0.0
        for ox in (-1, 0, 1):
            for oy in (-1, 0, 1):
                span = index.get((bx + ox, by + oy))
                if span is None:
                    continue
                s, e = span
                dx = px[i] - sx[s:e]
                dy = py[i] - sy[s:e]
                d2 = dx * dx + dy * dy
                near = d2 <= CUTOFF_M**2
                if not near.any():
                    continue
                total += float(np.exp(-0.5 * d2[near] / BANDWIDTH_M**2) @ sw[s:e][near])
        out[i] = total
    return out


def spread_exposure(grids: pd.DataFrame, *, per_side: int = 5) -> pd.DataFrame:
    """격자의 가구수를 셀 내부에 균일하게 펼친다.

    가구를 셀 중심 한 점에 몰면 셀 모서리에서 E_i가 급락해 λ̂가 인위적으로 치솟는다
    (중심 K=1 vs 모서리 K(707m)=0.018). 실제 가구는 셀에 퍼져 있으므로
    per_side² 개의 하위 점으로 나눠 얹는다.

    입력: `x_5179` `y_5179` `households` (셀 중심 기준)
    """
    step = 1000.0 / per_side
    offsets = (np.arange(per_side) - (per_side - 1) / 2) * step
    ox, oy = np.meshgrid(offsets, offsets)
    ox, oy = ox.ravel(), oy.ravel()

    x = (grids["x_5179"].to_numpy(float)[:, None] + ox[None, :]).ravel()
    y = (grids["y_5179"].to_numpy(float)[:, None] + oy[None, :]).ravel()
    w = np.repeat(grids["households"].to_numpy(float) / len(ox), len(ox))
    return pd.DataFrame({"x_5179": x, "y_5179": y, "households": w})


def lambda_hat(
    points: pd.DataFrame,
    fires: pd.DataFrame,
    exposure: pd.DataFrame,
    *,
    m: float,
    lambda_bar: float,
) -> pd.DataFrame:
    """점마다 λ̂를 계산한다.

    입력(전부 EPSG:5179 좌표):
      · `points`   — `x_5179` `y_5179`
      · `fires`    — `x_5179` `y_5179` `weight`(w_sev × 시간감쇠)
      · `exposure` — `x_5179` `y_5179` `households`

    반환: `points` + `intensity`(분자 커널 합) · `exposure`(E_i) · `lambda_hat`
    """
    px = points["x_5179"].to_numpy(float)
    py = points["y_5179"].to_numpy(float)

    numer = _weighted_sum(
        px, py, fires["x_5179"].to_numpy(float), fires["y_5179"].to_numpy(float),
        fires["weight"].to_numpy(float),
    )
    e_i = _weighted_sum(
        px, py, exposure["x_5179"].to_numpy(float), exposure["y_5179"].to_numpy(float),
        exposure["households"].to_numpy(float),
    )

    out = points.copy()
    out["intensity"] = numer
    out["exposure"] = e_i
    out["lambda_hat"] = (numer + m * lambda_bar) / (e_i + m)
    return out


def prepare_fires(
    fires: pd.DataFrame, *, reference_day: pd.Timestamp, residential_only: bool = True
) -> pd.DataFrame:
    """화재 이벤트 → 커널 소스(`x_5179` `y_5179` `weight`).

    weight = w_sev × 시간감쇠. 좌표가 없는 이벤트는 커널에 얹을 수 없어 제외한다.

    **주거 화재만 쓴다(2026-08-04 재론 확정).** 근거는 실측 3건이다.
      · 구성 비대칭 — 주거는 화재의 21.8~39.7%인데 **사망의 60~79%**를 차지한다.
        전체 화재를 쓰면 '불이 나는 곳'(상업·차량·쓰레기)을 배우게 된다.
      · `w_sev`가 이 비대칭을 보정하지 못한다 — 주거 비중이 건수→가중에서
        **1.03~1.11배**밖에 안 오른다(사망·부상 사건이 드물어 대부분 w=1로 균등 취급).
        즉 분자는 사실상 화재 '건수' 강도이고, 그래서 무엇을 넣느냐가 더 중요하다.
      · 비주거는 추가 정보가 없다 — 비주거만으로 만든 λ̂의 주거사망 포집률이
        전북에서 22.2%로 **가구수 베이스라인과 정확히 동률**이었다.
    표본이 줄어 농촌 λ̂가 성겨지지만, §2-2가 농촌은 랭킹 대신 필터+가구 정렬로 가기로
    이미 정했으므로 설계상 문제가 아니다.
    """
    df = fires
    if residential_only:
        if "is_residential" not in df.columns:
            raise DataTrapError("주거 판별 컬럼(is_residential)이 없다 — load_fires를 경유하라")
        df = df.loc[df["is_residential"]]
    df = df.dropna(subset=["x_5179", "y_5179"]).copy()
    days = (reference_day - df["occurred"]).dt.days.fillna(0)
    df["weight"] = severity_weight(df["DCSD_CNT"], df["INJPSN_CNT"], df["PRPT_DAM_AMT"]) * time_decay(days)
    return df[["x_5179", "y_5179", "weight"]]


def jaccard(a, b) -> float:
    """두 상위 집합의 자카드 유사도 — m 민감도 **보고**용(튜닝 아님).

    사망 라벨은 시도당 7~16셀의 소표본이라 포집률로 m을 고르면 노이즈에 과적합한다.
    라벨 없이 '순위가 얼마나 흔들리나'만 본다.
    """
    sa, sb = set(a), set(b)
    if not sa and not sb:
        return 1.0
    return len(sa & sb) / len(sa | sb)


def top_share(df: pd.DataFrame, column: str = "lambda_hat", *, frac: float = 0.10) -> list:
    n = max(1, int(len(df) * frac))
    return df.nlargest(n, column).index.tolist()
