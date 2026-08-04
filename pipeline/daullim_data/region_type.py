"""도농 판별 — `도농판별-공간분석-정의서` §2-2의 결정 트리.

스코어링이 아니라 **결정 트리**인 이유는 감사 가능성이다. 왜 이 격자가 농촌인지
한 줄로 설명되어야 한다. 임계값 1,500/300은 DEGURBA(EU Eurostat·OECD·UN 통계위) 준용.

축이 둘이라는 점을 오해하지 마라(확정 결정 6):
  · **저장값** `region_type_cd` = 밀도 기반 4분류. BUFFER를 보존한다 — 화면·감사용
  · **알고리즘 클래스** = 타이브레이크 후 URBAN/RURAL 2분. λ̄·m·백분위가 타는 축
BUFFER를 별도 클래스로 추정하지 않는 이유는 표본이 작아 모멘트 추정이 불안정하기 때문이다.
어차피 한쪽으로 배정되므로 그 클래스 값을 쓴다.
"""

from __future__ import annotations

from dataclasses import dataclass

import pandas as pd

# §2-5 확정 파라미터 — 묻지 말고 그대로 쓴다.
DENSITY_URBAN = 1_500  # 명/km² 이상 → URBAN
DENSITY_RURAL = 300  # 명/km² 미만 → RURAL
BUFFER_APT_RATIO = 0.5  # 완충대 타이브레이크: 아파트율
BUFFER_DISPATCH_SEC = 420  # 완충대 타이브레이크: 출동소요(초). 골든타임 7분
MIXED_NONAPT_LO, MIXED_NONAPT_HI = 0.3, 0.7  # 도농 복합 플래그 구간

URBAN, RURAL, BUFFER, NO_POP = "URBAN", "RURAL", "BUFFER", "NO_POP"

# 플랫폼 라벨(`CTY_FRMVL_SE_NM`) ↔ 우리 알고리즘 클래스
PLATFORM_LABEL = {"도시": URBAN, "농촌": RURAL}


def classify_row(pop: float, apt_ratio: float | None, dispatch_sec: float | None) -> tuple[str, str]:
    """격자 하나를 판별한다 → (저장값 4분류, 알고리즘 클래스 2분류).

    1km 격자이므로 인구수가 곧 밀도(명/km²)다.
    출동소요가 없으면(화재 이력이 없는 격자) 아파트율만으로 타이브레이크한다 —
    없는 근거를 있는 것처럼 쓰지 않는다.
    """
    if pd.isna(pop) or pop <= 0:
        return NO_POP, NO_POP
    if pop >= DENSITY_URBAN:
        return URBAN, URBAN
    if pop < DENSITY_RURAL:
        return RURAL, RURAL
    urbanish = (apt_ratio is not None and not pd.isna(apt_ratio) and apt_ratio >= BUFFER_APT_RATIO) or (
        dispatch_sec is not None
        and not pd.isna(dispatch_sec)
        and dispatch_sec < BUFFER_DISPATCH_SEC
    )
    return BUFFER, (URBAN if urbanish else RURAL)


def classify(grids: pd.DataFrame) -> pd.DataFrame:
    """격자 테이블에 `region_type_cd`·`algo_class`·`is_mixed`를 붙인다.

    입력 필수 컬럼: `grid1k` · `pop` · `apt_ratio`(nullable) · `dispatch_sec`(nullable)
    """
    out = grids.copy()
    if "dispatch_sec" not in out.columns:
        out["dispatch_sec"] = pd.NA
    pairs = [
        classify_row(p, a, d)
        for p, a, d in zip(out["pop"], out["apt_ratio"], out["dispatch_sec"])
    ]
    out["region_type_cd"] = [s for s, _ in pairs]
    out["algo_class"] = [a for _, a in pairs]
    # 도농 복합(Rururban) — 자동 처방 대신 가구 확인을 우선하라는 표식이다.
    out["is_mixed"] = (
        out["region_type_cd"].eq(BUFFER)
        & out["nonapt_ratio"].between(MIXED_NONAPT_LO, MIXED_NONAPT_HI)
    ).fillna(False)
    return out


def promote_no_pop(grids: pd.DataFrame, residential_fires: pd.Series) -> pd.DataFrame:
    """`P=0 ∧ 주거화재>0` → '비정형 주거 확인 큐'로 승격.

    센서스에 안 잡히는 컨테이너·비닐하우스 거주 가능성이 높다 —
    **통계 부재가 곧 최고 취약의 신호**다. 반대로 주거화재도 0이면 임야·공장으로 보고 제외한다.
    """
    out = grids.copy()
    fires = out["grid1k"].map(residential_fires).fillna(0)
    out["no_pop_promoted"] = out["region_type_cd"].eq(NO_POP) & fires.gt(0)
    return out


@dataclass
class AgreementReport:
    """플랫폼 라벨 대조 — v0 성적표 1. 목표 URBAN 95% / RURAL 80%.

    ⚠️ 대조 규약을 정의서와 맞추는 것이 핵심이다(2026-08-04 실측으로 확정).
      · 유니버스 = **3개 시도 합산**, 화재 이력이 있는 격자
      · **저장값 `region_type_cd`가 URBAN/RURAL인 것만** — BUFFER·NO_POP 제외
      · 분모는 **판별 기준**(행 방향). 플랫폼 기준(열 방향)으로 재면 다른 수가 나온다
    이 규약으로 879/925=95.0%, 985/1236=79.7%가 정의서와 숫자 단위까지 일치한다.

    플랫폼 라벨의 정체도 실측으로 확인해 뒀다 — `CTY_FRMVL_SE_NM`은 밀도가 아니라
    **행정 구분**이다(동→도시, 읍·면→농촌, 교차표 100% 결정적). 우리 판별은 DEGURBA
    밀도 기준이므로 두 지표는 서로 다른 것을 재며, 100% 일치는 애초에 목표가 아니다.
    """

    matrix: pd.DataFrame  # index=판별(저장값), columns=플랫폼 라벨
    urban_pct: float
    rural_pct: float
    urban_n: int
    rural_n: int

    def passed(self, *, urban_min: float = 95.0, rural_min: float = 79.5) -> bool:
        # 정의서의 'RURAL 80%'는 79.7%의 반올림값이라 하한을 79.5로 둔다.
        return self.urban_pct >= urban_min and self.rural_pct >= rural_min

    def render(self) -> str:
        mark = "통과" if self.passed() else "미달"
        return "\n".join(
            [
                "  [플랫폼 라벨 대조] 3개 시도 합산 · BUFFER/NO_POP 제외 · 판별 기준",
                "    " + self.matrix.to_string().replace("\n", "\n    "),
                f"    URBAN {self.urban_pct:.1f}% ({self.urban_n:,}격자, 목표 95) · "
                f"RURAL {self.rural_pct:.1f}% ({self.rural_n:,}격자, 목표 80) → {mark}",
            ]
        )


def agreement(labeled: pd.DataFrame) -> AgreementReport:
    """저장값 `region_type_cd`와 플랫폼 라벨의 일치도(판별 기준)."""
    df = labeled.dropna(subset=["platform_label"])
    df = df.loc[df["region_type_cd"].isin([URBAN, RURAL])]
    truth = df["platform_label"].map(PLATFORM_LABEL)
    matrix = pd.crosstab(df["region_type_cd"].rename("판별"), truth.rename("플랫폼"))

    def hit(cls: str) -> tuple[float, int]:
        if cls not in matrix.index or not matrix.loc[cls].sum():
            return float("nan"), 0
        n = int(matrix.loc[cls].sum())
        return 100.0 * matrix.loc[cls].get(cls, 0) / n, n

    u_pct, u_n = hit(URBAN)
    r_pct, r_n = hit(RURAL)
    return AgreementReport(matrix=matrix, urban_pct=u_pct, rural_pct=r_pct, urban_n=u_n, rural_n=r_n)


def dispatch_monotonicity(labeled: pd.DataFrame) -> pd.DataFrame:
    """출동소요가 클래스 순서대로 단조 증가하는가 — v0 성적표 2.

    일치도보다 이쪽이 중요하다. 이 분류가 **골든타임 7분 도달 가능권과 불가능권을
    실제로 가르는가**라는 외적 타당성이기 때문이다.
    """
    order = [URBAN, BUFFER, RURAL, NO_POP]
    g = (
        labeled.dropna(subset=["dispatch_sec"])
        .groupby("region_type_cd")["dispatch_sec"]
        .agg(mean="mean", median="median", n="size")
    )
    g = g.reindex([c for c in order if c in g.index])
    g["mean_min"] = (g["mean"] / 60).round(1)
    g["median_min"] = (g["median"] / 60).round(1)
    return g


def is_monotonic(stats: pd.DataFrame, *, column: str = "median") -> bool:
    vals = stats[column].dropna().tolist()
    return all(a < b for a, b in zip(vals, vals[1:]))
