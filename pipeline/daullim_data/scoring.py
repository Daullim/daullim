"""점수·순위 — 세 항을 곱해 `score`·`risk_level_cd`·`order_key`를 확정한다.

    Score_raw = λ̂ × (1 + αV⊥) × exp(Σβx)

세 항은 관측 해상도가 다르고(점·격자·건물), 각각 독립적인 배수라 곱으로 묶인다.
λ̂가 기대 발생 강도, ②③이 무차원 상대위험 배수이므로 곱은 **'이 건물의 기대 위험'**이라는
해석 가능한 단위가 된다 — 서로 다른 동네의 두 건물을 직접 비교할 수 있는 근거이자
전국 단일 큐가 성립하는 이유다.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field

import numpy as np
import pandas as pd

from .region_type import RURAL, URBAN
from .regions import REGIONS

# ── score 정규화 (§2-5 확정) ────────────────────────────────────────────
# 곱 구조 + 화재 강도의 두꺼운 꼬리 때문에 Score_raw는 로그정규에 가깝다.
# 단순 min-max면 상위 1~2개가 100을 먹고 나머지가 0~5에 몰려 화면에서 변별이 안 되고,
# 백분위 랭크면 분포는 예쁘지만 '기대 위험의 근사'라는 단위 해석을 버리게 된다
# (관악구 1등과 임실군 1등이 둘 다 100이 되어 도농 비교가 깨진다).
# 로그가 분포를 펴고 q01/q99 클리핑이 극단값의 스케일 지배를 막는다 — 순서와 비율을 모두 보존.
Q_LO, Q_HI = 0.01, 0.99
SCORE_MIN, SCORE_MAX = 0.0, 100.0

# risk_level은 **절대 임계값**이다. 분위수(상위 10%=danger)로 하면 화면에 항상 일정 비율이
# 빨간색으로 남아 '위험 가구가 줄었는가'를 볼 수 없다 — 기획서 §5-1의 '성과지표를 투입에서
# 결과로'와 정면으로 어긋난다. 절대 임계값이어야 개선이 측정된다.
# 값은 FE 목데이터 전수 역산(ok 최대 31.0 · warn 38.4~66.3 · danger 최소 71.8).
DANGER_MIN, WARN_MIN = 70.0, 35.0

# 농촌 절대 필터 (§3-2). 랭킹이 아니라 **대상 지역 확정**이 역할이다.
RURAL_NONAPT_MIN, RURAL_ELDERLY_MIN = 0.8, 0.4

EXPLORE_FRACTION = 0.07  # G2 탐사 쿼터 5~10%의 중앙
RX_UNSUPPLIED = "RX-IOT"  # 보급이력 전량 NULL = 미보급 → 기기 설치(확정 결정 2)


@dataclass(frozen=True)
class ScoreParams:
    """`score_version`이 가리키는 변환 파라미터.

    ⚠️ **DDL의 `score_version`은 varchar(20)이라 파라미터를 못 담는다.**
    §2-5는 "변환 파라미터를 score_version에 함께 박아" 재현성을 확보하라고 하지만
    20자에는 들어가지 않는다. 그래서 버전은 **키**로만 쓰고 값은 사이드카
    (`seed/score_params.json`)에 남긴다 — 재현 가능성이라는 목적은 그대로 달성된다.
    """

    version: str
    q_lo_value: float  # ln(raw)의 q01
    q_hi_value: float  # ln(raw)의 q99
    alpha: float
    m_urban: float
    m_rural: float
    lambda_bar_urban: float
    lambda_bar_rural: float
    beta_age: float
    beta_struct: float
    universe: str = "+".join(REGIONS)
    computed_at: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


def raw_score(lambda_hat, area_mult, rr) -> pd.Series:
    """λ̂ × (1+αV⊥) × exp(Σβx). 전부 양수여야 로그 변환이 성립한다."""
    return pd.Series(np.asarray(lambda_hat, float) * np.asarray(area_mult, float) * np.asarray(rr, float))


def normalize_score(raw: pd.Series, *, q_lo: float = Q_LO, q_hi: float = Q_HI) -> tuple[pd.Series, float, float]:
    """ln(raw) → (q01,q99) robust min-max × 100 → clip[0,100].

    반환: (score, ln(raw)의 q_lo 값, q_hi 값). 뒤의 둘은 `score_version`에 묶어 남긴다.
    """
    r = pd.Series(np.asarray(raw, float))
    # raw=0(주변 화재 이력이 전혀 없는 건물)은 로그가 -inf다. 양수 최솟값으로 바닥을 깐다.
    positive = r[r > 0]
    floor = positive.min() if not positive.empty else 1e-12
    log_r = np.log(r.where(r > 0, floor))
    lo, hi = float(log_r.quantile(q_lo)), float(log_r.quantile(q_hi))
    if hi <= lo:  # 분포가 한 점에 몰린 경우 — 전원 중앙값 부여
        return pd.Series(np.full(len(r), 50.0), index=r.index), lo, hi
    score = (log_r - lo) / (hi - lo) * SCORE_MAX
    return score.clip(SCORE_MIN, SCORE_MAX).round(2), lo, hi


def risk_level(score: pd.Series) -> pd.Series:
    """절대 임계값 — danger ≥70 · warn ≥35 · ok <35."""
    s = pd.Series(np.asarray(score, float))
    return pd.Series(
        np.where(s >= DANGER_MIN, "danger", np.where(s >= WARN_MIN, "warn", "ok")), index=s.index
    )


# ── 동선 효율 (타이브레이커 3단) ────────────────────────────────────────
def morton_key(x_5179, y_5179, *, cell_m: int = 100) -> pd.Series:
    """Z-order(Morton) 곡선 — 공간적으로 가까운 건물이 순번에서도 붙는다.

    §2-3의 '동선 효율 ASC'는 잔차 동점에서 **처리량을 최대화**하라는 뜻이다.
    좌표를 그냥 x·y로 정렬하면 한 축을 훑고 되돌아오는 지그재그가 생기는데,
    Z-order는 2차원 근접성을 1차원 순서에 보존해 되돌아오는 이동을 줄인다.
    """
    xi = (np.asarray(x_5179, float) // cell_m).astype(np.int64)
    yi = (np.asarray(y_5179, float) // cell_m).astype(np.int64)
    xi -= xi.min()
    yi -= yi.min()
    key = np.zeros(len(xi), dtype=np.int64)
    for bit in range(24):  # 100m 셀 × 2^24 ≈ 1,600km — 시연 범위를 충분히 덮는다
        key |= ((xi >> bit) & 1) << (2 * bit)
        key |= ((yi >> bit) & 1) << (2 * bit + 1)
    return pd.Series(key)


# ── 농촌 분기 ───────────────────────────────────────────────────────────
def rural_target(nonapt_ratio, elderly_ratio) -> pd.Series:
    """Target_rural = { g ∈ RURAL | NonApt ≥ 0.8 ∧ Elderly ≥ 0.4 }.

    농촌은 랭킹을 포기한다 — 사건이 균등 희소해 '어느 셀을 맞히나'라는 문제 설정이
    성립하지 않고, 사망 셀의 이력 순위가 72~3,273위로 흩어져 랭킹이 정보를 못 담는다.
    필터로 대상을 확정하고 순서는 가구 속성으로 정한다.
    """
    n = pd.Series(np.asarray(nonapt_ratio, float))
    e = pd.Series(np.asarray(elderly_ratio, float))
    return (n >= RURAL_NONAPT_MIN) & (e >= RURAL_ELDERLY_MIN)


# ── 순위 확정 ───────────────────────────────────────────────────────────
@dataclass
class OrderReport:
    total: int
    urban: int
    rural: int
    rural_targeted: int
    explore: int
    notes: list[str] = field(default_factory=list)
    blocks: dict = field(default_factory=dict)

    def render(self) -> str:
        lines = [
            f"  [순위] 전역 1..{self.total:,}",
            f"    URBAN {self.urban:,} · RURAL {self.rural:,} (절대필터 충족 {self.rural_targeted:,})",
            f"    블록 — 농촌대상 {self.blocks.get(0, 0):,} → 도시 {self.blocks.get(1, 0):,} "
            f"→ 농촌기타 {self.blocks.get(2, 0):,}",
            f"    탐사 쿼터 {self.explore:,} ({100 * self.explore / max(self.total, 1):.1f}%, 목표 5~10%)",
        ]
        return "\n".join(lines + [f"    · {n}" for n in self.notes])


# 큐 블록 — 정렬 논리가 다른 집단을 섞지 않고 계층으로 쌓는다(§2-2).
# 화면은 항상 시군구로 필터되므로, 전역 계층 정렬이 곧 시군구 내부 블록 순서가 된다.
TIER_RURAL_TARGET = 0  # 농촌 절대필터 통과 — 가구 속성 정렬
TIER_URBAN = 1  # 도시 — score 캐스케이드
TIER_RURAL_REST = 2  # 농촌 필터 미통과 — score 캐스케이드


def assign_order(buildings: pd.DataFrame, *, rng_seed: int = 20260805) -> tuple[pd.DataFrame, OrderReport]:
    """블록 배치 + 타이브레이커 캐스케이드로 `order_key`를 확정하고 G2 쿼터를 표기한다.

    **블록이 먼저다.** 농촌은 랭킹을 포기하고 필터로 대상을 확정한 뒤 가구 속성으로
    정렬한다(§2-2) — 도시의 score 정렬과 논리가 다르므로 한 목록에 섞지 않고 계층으로 쌓는다.

        블록 0  농촌 절대필터 통과 : 사용승인일 ASC → 1인가구율 DESC → 소방서거리 DESC
        블록 1  도시              : score DESC → 연차 DESC → 동선(Z-order) ASC
        블록 2  농촌 필터 미통과    : 블록 1과 같은 캐스케이드

    도시 캐스케이드의 원칙: **위험으로 가르고, 위험이 침묵하면 처리량으로 가르고,
    그마저 침묵하면 무정보 키임을 선언하고 닫는다.** 무작위 셔플은 쓰지 않는다.

    ⚠️ 두 자리에서 원래 축이 무력화돼 대리를 쓴다(보급이력 전량 NULL — 확정 결정 1).
      · 도시 2단 '만료확률 DESC' → **연차 DESC** (만료확률의 대리, x₁과 같은 방향)
      · 농촌 1순위 '보급연차 DESC' → **사용승인일 ASC** (오래된 건물 먼저 — 확정 결정 2)
    보급이력이 들어오면 둘 다 원래 축으로 복귀한다.
    """
    out = buildings.copy()
    # 오래될수록 큰 값 = DESC 정렬에서 앞. **결측은 -inf로 맨 뒤로 보낸다** —
    # 0으로 두면 실제 날짜(-738,000 근처)보다 커서 '모름'이 '가장 오래됨'으로 둔갑해
    # 큐 1등을 차지한다(실측: 임실군 상위 5건이 전부 사용승인일 결측이었다).
    out["_age_days"] = (
        pd.to_datetime(out["use_apr_day"].astype("string"), format="%Y%m%d", errors="coerce")
        .map(lambda d: -d.toordinal() if pd.notna(d) else float("-inf"))
    )
    out["_morton"] = morton_key(out["x_5179"], out["y_5179"]).values

    targeted = out.get("rural_target", pd.Series(False, index=out.index)).fillna(False)
    is_rural = out["algo_class"].eq(RURAL)
    out["_tier"] = np.where(
        is_rural & targeted, TIER_RURAL_TARGET, np.where(is_rural, TIER_RURAL_REST, TIER_URBAN)
    )
    # 농촌 가구 정렬키. 독거·소방서거리는 건물 단위 값이 없어 격자 지표로 근사한다.
    out["_single"] = -out.get("single_ratio", pd.Series(0.0, index=out.index)).fillna(0.0)
    out["_fdist"] = -out.get("fire_distance", pd.Series(0.0, index=out.index)).fillna(0.0)

    blocks = []
    for tier in (TIER_RURAL_TARGET, TIER_URBAN, TIER_RURAL_REST):
        sub = out.loc[out["_tier"] == tier]
        if sub.empty:
            continue
        if tier == TIER_RURAL_TARGET:
            sub = sub.sort_values(
                ["_age_days", "_single", "_fdist"], ascending=[False, True, True], kind="mergesort"
            )
        else:
            sub = sub.sort_values(
                ["score", "_age_days", "_morton"], ascending=[False, False, True], kind="mergesort"
            )
        blocks.append(sub)
    ordered = pd.concat(blocks, ignore_index=True)
    ordered["order_key"] = np.arange(1, len(ordered) + 1)

    # G2 — 큐로 뽑힌 가구에서만 회신이 쌓이면 재학습이 자기 선택 편향에 갇힌다.
    # 선정 지역 내 무작위 배정으로 "우리 모델이 무작위보다 몇 배 나은가"를 실측하게 한다.
    rng = np.random.default_rng(rng_seed)
    n_explore = int(round(len(ordered) * EXPLORE_FRACTION))
    picks = rng.choice(len(ordered), size=n_explore, replace=False)
    ordered["is_explore"] = False
    ordered.loc[picks, "is_explore"] = True

    rep = OrderReport(
        total=len(ordered),
        urban=int(ordered["algo_class"].eq(URBAN).sum()),
        rural=int(ordered["algo_class"].eq(RURAL).sum()),
        rural_targeted=int((ordered["_tier"] == TIER_RURAL_TARGET).sum()),
        explore=int(ordered["is_explore"].sum()),
        notes=[
            "블록 배치 — 농촌 절대필터 통과 → 도시 → 농촌 미통과 (정렬 논리가 달라 섞지 않는다)",
            "보급이력 전량 NULL로 두 축을 대리 사용: 도시 2단=연차 · 농촌 1순위=사용승인일↑",
        ],
    )
    rep.blocks = {
        int(t): int((ordered["_tier"] == t).sum())
        for t in (TIER_RURAL_TARGET, TIER_URBAN, TIER_RURAL_REST)
    }
    return ordered.drop(columns=["_age_days", "_morton", "_single", "_fdist", "_tier"]), rep


def basis_text(order_key: pd.Series) -> pd.Series:
    """큐 행의 보조 설명줄. 보급이력이 없으므로 '미보급'을 그대로 적는다(확정 결정 2)."""
    return pd.Series([f"미보급 · 동선 {int(k)}" for k in order_key], index=pd.Series(order_key).index)


def rx_code(n: int) -> pd.Series:
    """미보급이면 전지 교체가 무의미하다 — 기기 설치로 간다(확정 결정 2).

    방문 전이라 실측이 없고, 현장 회신이 오면 덮인다.
    """
    return pd.Series([RX_UNSUPPLIED] * n)
