"""③ β 재학습 — pairwise Learning-to-Rank (numpy만).

왜 pairwise인가 — 배우려는 건 확률이 아닌 순위. 쌍을 같은 격자 안에서만 만들면 ①λ̂·②V⊥가
두 건물에 동일하게 걸려 상쇄, 남는 신호가 정확히 ③의 β — 곱 구조에서 항을 분리하는 자연스러운 방법.

    P(i가 j보다 위험) = σ(β·(xᵢ − xⱼ))

로그를 취하면 선형이라 로지스틱 회귀가 그대로 적용됨.

⚠️ 소표본 경고 — 사망 라벨은 시연 지역 2건(관악 2·임실 0), 3개 파라미터 추정 불가.
대체 라벨 사용 시에도 부트스트랩 신뢰구간 필수 병기, 구간이 0을 포함하면 학습값 미채택
(노이즈를 계수로 굳히는 것이기 때문).
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

FEATURES = ("x1_age", "x2_struct", "x3_prior")
MAX_NEG_PER_POS = 20  # 양성 하나당 표집할 음성 수 — 쌍은 늘어도 실질 표본은 양성 수다


@dataclass
class LtrResult:
    features: tuple[str, ...]
    beta: np.ndarray
    ci_lo: np.ndarray
    ci_hi: np.ndarray
    n_positive: int
    n_pairs: int
    notes: list[str] = field(default_factory=list)

    @property
    def significant(self) -> np.ndarray:
        """신뢰구간이 0을 포함하지 않는 계수만 True."""
        return (self.ci_lo > 0) | (self.ci_hi < 0)

    def render(self, baseline: dict[str, float] | None = None) -> str:
        lines = [
            f"    양성 {self.n_positive:,} · 쌍 {self.n_pairs:,}",
            f"    {'변수':<10} {'학습 β':>9} {'95% CI':>22} {'유의':>5}"
            + ("  v0" if baseline else ""),
        ]
        for i, f in enumerate(self.features):
            mark = "○" if self.significant[i] else "×"
            base = f"  {baseline.get(f, 0.0):>5.2f}" if baseline else ""
            lines.append(
                f"    {f:<10} {self.beta[i]:>9.3f} "
                f"[{self.ci_lo[i]:>9.3f}, {self.ci_hi[i]:>8.3f}] {mark:>5}{base}"
            )
        return "\n".join(lines + [f"    · {n}" for n in self.notes])


def make_pairs(
    df: pd.DataFrame, *, label: str, group: str, rng: np.random.Generator,
    features: tuple[str, ...] = FEATURES, max_neg: int = MAX_NEG_PER_POS,
) -> tuple[np.ndarray, np.ndarray]:
    """같은 그룹(격자) 안에서 (양성, 음성) 차이 벡터 생성.

    그룹 밖 쌍 생성 금지 — ①②가 상쇄 안 돼 β에 다른 항 신호 혼입.
    반환: (차이 벡터 Δx, 양성 소속 그룹 id) — 후자는 부트스트랩 재표집 단위.
    """
    deltas, owners = [], []
    for gid, grp in df.groupby(group):
        pos = grp.loc[grp[label]]
        neg = grp.loc[~grp[label]]
        if pos.empty or neg.empty:
            continue
        neg_x = neg[list(features)].to_numpy(float)
        for _, prow in pos.iterrows():
            take = neg_x if len(neg_x) <= max_neg else neg_x[
                rng.choice(len(neg_x), size=max_neg, replace=False)
            ]
            deltas.append(prow[list(features)].to_numpy(float) - take)
            owners.append(np.full(len(take), len(owners)))
    if not deltas:
        return np.empty((0, len(features))), np.empty(0, dtype=int)
    return np.vstack(deltas), np.concatenate(owners)


def fit_pairwise(delta: np.ndarray, *, l2: float = 1.0, iters: int = 400, lr: float = 0.5) -> np.ndarray:
    """모든 쌍의 라벨이 1인 로지스틱 회귀 — 경사하강.

    L2 규제는 소표본 대응 — 규제 없으면 분리 가능한 방향으로 계수 발산.
    """
    if len(delta) == 0:
        return np.zeros(delta.shape[1] if delta.ndim == 2 else 0)
    beta = np.zeros(delta.shape[1])
    for _ in range(iters):
        p = 1.0 / (1.0 + np.exp(-delta @ beta))
        grad = delta.T @ (1.0 - p) / len(delta) - l2 * beta / len(delta)
        beta += lr * grad
    return beta


def fit_with_ci(
    df: pd.DataFrame, *, label: str, group: str, features: tuple[str, ...] = FEATURES,
    n_boot: int = 300, seed: int = 20260805, l2: float = 1.0,
) -> LtrResult:
    """β 추정 + 양성 단위 부트스트랩 신뢰구간.

    재표집 단위는 쌍이 아닌 양성 — 쌍은 양성 하나에서 다수 파생되므로 쌍 재표집 시
    표본이 실제보다 커 보여 구간이 거짓으로 좁아짐.
    """
    rng = np.random.default_rng(seed)
    delta, owners = make_pairs(df, label=label, group=group, rng=rng, features=features)
    n_pos = int(df[label].sum())
    if len(delta) == 0:
        return LtrResult(features, np.zeros(len(features)), np.zeros(len(features)),
                         np.zeros(len(features)), n_pos, 0, ["학습 쌍을 만들 수 없다"])

    beta = fit_pairwise(delta, l2=l2)
    n_owners = owners.max() + 1
    boots = []
    for _ in range(n_boot):
        pick = rng.choice(n_owners, size=n_owners, replace=True)
        idx = np.concatenate([np.flatnonzero(owners == o) for o in pick])
        boots.append(fit_pairwise(delta[idx], l2=l2))
    b = np.vstack(boots)
    return LtrResult(
        features=features, beta=beta,
        ci_lo=np.percentile(b, 2.5, axis=0), ci_hi=np.percentile(b, 97.5, axis=0),
        n_positive=n_pos, n_pairs=len(delta),
    )


def capture_rate(df: pd.DataFrame, score_col: str, label_col: str, *, frac: float = 0.10) -> float:
    """상위 frac에 라벨이 얼마나 잡히는가 — HitRate@Top10%."""
    n = max(1, int(len(df) * frac))
    total = df[label_col].sum()
    if total == 0:
        return float("nan")
    return 100.0 * df.nlargest(n, score_col)[label_col].sum() / total


@dataclass
class CaptureResult:
    """포집률 + 신뢰구간. `n_positive`를 항상 함께 낸다 — 구간 폭을 읽으려면 표본을 알아야 한다."""

    rate: float
    ci_lo: float
    ci_hi: float
    n_positive: int

    def render(self) -> str:
        if self.n_positive == 0:
            return "     —  (양성 0건)"
        return f"{self.rate:>5.1f}%  [{self.ci_lo:>5.1f}, {self.ci_hi:>5.1f}]  n={self.n_positive}"


def capture_rate_ci(
    df: pd.DataFrame, score_col: str, label_col: str, *,
    frac: float = 0.10, n_boot: int = 1000, seed: int = 20260811,
) -> CaptureResult:
    """포집률 + 양성 단위 부트스트랩 신뢰구간.

    재표집 단위는 건물 전체가 아닌 양성 — 포집률 분모가 양성 수라 불확실성도 거기서 옴,
    음성까지 섞어 재표집하면 상위 10% 경계가 흔들려 다른 것을 재게 됨.

    ⚠️ 양성 적으면 구간 넓음 — 눈금이 1/n_positive라 전북(13건)은 7.7%p 단위로 점프,
    계산 오류가 아니라 표본 크기 그 자체.
    """
    n = max(1, int(len(df) * frac))
    top = set(df.nlargest(n, score_col).index)
    positives = df.index[df[label_col].astype(bool)]
    if len(positives) == 0:
        return CaptureResult(float("nan"), float("nan"), float("nan"), 0)

    hit = np.fromiter((i in top for i in positives), dtype=float, count=len(positives))
    rng = np.random.default_rng(seed)
    boots = [rng.choice(hit, size=hit.size, replace=True).mean() for _ in range(n_boot)]
    return CaptureResult(
        rate=100.0 * hit.mean(),
        ci_lo=100.0 * float(np.percentile(boots, 2.5)),
        ci_hi=100.0 * float(np.percentile(boots, 97.5)),
        n_positive=int(hit.size),
    )
