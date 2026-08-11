"""원본 이벤트(화재·119신고) 적재와 검증

모든 읽기는 `utils`의 함정 유틸을 경유한다. 이 모듈이 하는 일은 넷이다.
  1. 로드 — NFD 파일명·인코딩 혼재를 흡수
  2. 감사 — 값 범위 fail-fast + 충전율 리포트(스왑 탐지의 실제 수단)
  3. 클리핑 — 시도 존 화이트리스트로 경계 밖 격자 제거
  4. 연도 정규화 — 2021 신고 분류 정책 단절(라벨 드리프트) 통제

λ̂ 가중(`w_sev`)과 도농 판별은 각각 커밋 4·3의 몫이다 — 여기서는 원자료만 정직하게 세운다.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import pandas as pd

from .utils import (
    DATA_ROOT,
    RANGE_SPEC_WEATHER,
    DataTrapError,
    FillReport,
    clip_to_sido,
    fill_report,
    glob_kr,
    grid500_to_1km,
    nfc_series,
    normalize_month,
    normalize_year_counts,
    read_csv_kr,
    validate_ranges,
)

FIRE_DIR = DATA_ROOT / "platform" / "fire_2023"
CALL_DIR = DATA_ROOT / "platform" / "call119"

# 실측 단위 확인(2026-08-04): DSPT_REQ_HR 서울 평균 355초≈5.9분(정의서 URBAN 실측과 일치) — 초 단위, 도농 완충대 타이브레이크 420s와 동일 축
FIRE_USECOLS = [
    "GRID_ID",
    "LAT",
    "LOT",
    "DCSD_CNT",  # 사망 — w_sev 3
    "INJPSN_CNT",  # 부상 — w_sev 2
    "PRPT_DAM_AMT",  # 재산피해 — w_sev 1
    "OCRN_YMD",
    "OCRN_YR",
    "OCRN_MM",
    "DSPT_REQ_HR",  # 출동소요(초) — 도농 판별 R
    "FRSTN_GRNDS_DSTNC",  # 소방서-현장 거리 — 농촌 정렬키
    "CTY_FRMVL_SE_NM",  # 플랫폼 도농 라벨 — 판별 검증 정답지
    "FCLT_PLC_LCLSF_NM",  # 주거 여부
    "CTPV_NM",
    "SGG_NM",
    "EMD_NM",
    *RANGE_SPEC_WEATHER,
]

CALL_USECOLS = ["GRID_ID", "DCLR_YR", "DCLR_MM", "EMRG_RSCU_ASSRT_NM"]

# 500m 격자 ID 형식 — 격자 미부여/형식 이상 행을 클리핑과 분리해 세기 위해 쓴다.
GRID500_PATTERN = r"^..\d{2}[a-z]\d{2}[a-z]$"

RESIDENTIAL = "주거"
CALL_FIRE = "화재"

# '활동 있는 침묵' — 총신고는 많은데 화재신고 0인 격자. 총신고량 존재=거주 신호이므로
# 화재 0을 '안전' 아닌 '무관측' 후보로 읽음(PoC 실측: 서울 265·부산 135·전북 481).
SILENT_MIN_TOTAL = 50


@dataclass
class IngestReport:
    """적재 1건의 감사 기록. 발표 자산이라 사람이 읽을 형태로 남김.

    행 손실 사유 미통합 원칙 — '격자 미부여'(읍면동 상향 집계 대상)와 '시도 경계 밖'(ADR-008 §5
    클리핑)은 원인·후속 처리가 다름. 한 숫자로 합치면 14배 팽창 함정 발생 여부를 알 수 없게 됨.
    """

    source: str
    rows_raw: int
    rows_no_grid: int
    rows_out_of_sido: int
    rows_kept: int
    fills: FillReport
    notes: list[str] = field(default_factory=list)

    def render(self) -> str:
        def pct(n: int) -> str:
            return f"{100.0 * n / self.rows_raw:.2f}%" if self.rows_raw else "—"

        lines = [
            f"■ {self.source}",
            f"  원본 {self.rows_raw:,}행 → 유효 {self.rows_kept:,}행",
            f"    격자 미부여 {self.rows_no_grid:,} ({pct(self.rows_no_grid)}) — 읍면동 상향 집계 대상",
            f"    시도 경계 밖 {self.rows_out_of_sido:,} ({pct(self.rows_out_of_sido)}) — ADR-008 §5 클리핑",
            self.fills.render(),
        ]
        lines += [f"  · {n}" for n in self.notes]
        return "\n".join(lines)


def _find_fire_file(sido: str) -> Path:
    hits = glob_kr(FIRE_DIR, f"화재발생 건별 격자 정보_*_{sido}.csv")
    if not hits:
        raise DataTrapError(
            f"화재 원본 없음: {sido} ({FIRE_DIR}). data/README.md의 배치 경로를 확인하라."
        )
    return hits[0]


def load_fires(sido: str, *, path: Path | None = None) -> tuple[pd.DataFrame, IngestReport]:
    """화재발생 건별 격자 정보를 적재·검증한다.

    반환 DataFrame의 파생 컬럼: `grid1k` · `is_residential` · `month` · `occurred`
    """
    src = Path(path) if path else _find_fire_file(sido)
    raw = read_csv_kr(src, usecols=lambda c: c in FIRE_USECOLS)
    rows_raw = len(raw)

    for col in ("GRID_ID", "CTY_FRMVL_SE_NM", "FCLT_PLC_LCLSF_NM", "SGG_NM", "EMD_NM"):
        if col in raw.columns:
            raw[col] = nfc_series(raw[col].astype("string"))

    # 값 범위 위반은 여기서 fail-fast, 통과해도 충전율은 항상 병기 — 습도·적설 스왑은
    # 범위검사 통과 후 충전율 비대칭으로만 드러남.
    fills = validate_ranges(raw, RANGE_SPEC_WEATHER, name=f"{sido} 화재 기상")

    # 손실 사유 분리 집계 — 뭉치면 클리핑이 실제로 한 일을 알 수 없음.
    has_grid = raw["GRID_ID"].astype("string").str.match(GRID500_PATTERN, na=False)
    rows_no_grid = int((~has_grid).sum())
    df = clip_to_sido(raw.loc[has_grid], sido)
    rows_out_of_sido = int(has_grid.sum()) - len(df)

    df["grid1k"] = df["GRID_ID"].map(grid500_to_1km)
    df["is_residential"] = df["FCLT_PLC_LCLSF_NM"].eq(RESIDENTIAL)
    df["month"] = df["OCRN_MM"].map(normalize_month)
    df["occurred"] = pd.to_datetime(df["OCRN_YMD"].astype("string"), format="%Y%m%d", errors="coerce")

    no_coord = int(raw[["LAT", "LOT"]].isna().any(axis=1).sum())
    notes = [
        f"주거화재 {int(df['is_residential'].sum()):,}건 / 사망 {int(df['DCSD_CNT'].sum())}명 "
        f"· 부상 {int(df['INJPSN_CNT'].sum())}명",
        "플랫폼 도농 라벨: "
        + " · ".join(f"{k} {v:,}" for k, v in df["CTY_FRMVL_SE_NM"].value_counts().items()),
        f"원본 좌표 결측 {no_coord:,}건 ({100 * no_coord / rows_raw:.2f}%, 클리핑 전 기준)",
    ]
    return df, IngestReport(
        source=f"화재 2023 {sido} ({src.name})",
        rows_raw=rows_raw,
        rows_no_grid=rows_no_grid,
        rows_out_of_sido=rows_out_of_sido,
        rows_kept=len(df),
        fills=fills,
        notes=notes,
    )


def _call_files(sido: str) -> list[Path]:
    return glob_kr(CALL_DIR, f"119신고접수 건별 격자 정보_*_{sido}.csv")


# ── SGIS 1km 격자 통계 ──────────────────────────────────────────────────
SGIS_DIR = DATA_ROOT / "sgis" / "1. 통계"

# 코드집(`3. 코드집/2. 제공용 코드`) 실측 대조로 확정한 항목.
SGIS_ITEMS = {
    "to_in_001": "pop",  # 총인구 — P, 그리고 1km 격자이므로 밀도 D와 같은 수
    "to_ga_001": "households",  # 총가구수 — 노출량 E_i 후보
    "to_ho_001": "houses",  # 총주택(거처)수 — 아파트율 분모
    "in_grp_008": "elderly",  # 65세이상
    "ga_sd_005": "single",  # 1인가구
    "ho_gb_003": "apt",  # 아파트
}
SGIS_SUBDIRS = ("1. 2024년 격자 통계(인구)", "2. 2024년 격자 통계(가구)", "3. 2024년 격자 통계(주택)")


def load_sgis_grid(zones: tuple[str, ...]) -> pd.DataFrame:
    """SGIS 1km 격자 통계(long) → 격자당 1행(wide) 변환.

    ⚠️ 존은 100km 셀이라 행정구역과 불일치 — '다사'는 서울시가 아닌 수도권 전역
    (7,008격자·인구 2,515만)을 덮음. 시군구 단위 필요 시 격자 아닌 좌표/이벤트 행정구역명으로 필터.

    반환: `grid1k` + SGIS_ITEMS 값 컬럼 + 파생 비율(`elderly_ratio`·`single_ratio`·`apt_ratio`·`nonapt_ratio`)
    """
    frames: list[pd.DataFrame] = []
    for sub in SGIS_SUBDIRS:
        for zone in zones:
            for src in glob_kr(SGIS_DIR / sub, f"*_{zone}_1K.csv"):
                raw = read_csv_kr(src, dtype={"격자코드": "string", "통계항목": "string"})
                raw = raw.loc[raw["통계항목"].isin(SGIS_ITEMS)]
                frames.append(
                    pd.DataFrame(
                        {
                            "grid1k": nfc_series(raw["격자코드"]),
                            "item": raw["통계항목"].map(SGIS_ITEMS),
                            "value": pd.to_numeric(raw["통계값"], errors="coerce"),
                        }
                    )
                )
    if not frames:
        raise DataTrapError(f"SGIS 격자 통계 없음: {zones} ({SGIS_DIR})")

    long = pd.concat(frames, ignore_index=True)
    wide = long.pivot_table(index="grid1k", columns="item", values="value", aggfunc="sum")
    wide = wide.reindex(columns=list(dict.fromkeys(SGIS_ITEMS.values())))

    # ⚠️ SGIS long 포맷은 0값 항목을 행으로 미출력 — pivot 후 결측은 '모름' 아닌 '0채/0명'.
    # NaN 유지 시 아파트 0채 격자의 비아파트율 미계산 → 농촌 취약 지역 통째 누락
    # (전북 실측: 비아파트율 결측 94.6%, 잔여 격자만으로는 아파트율 중앙값 0.728이라는 불가능한 값 도출).
    # 다마존 대조: 총주택 6,912격자 중 아파트 행 372개뿐 — 나머지는 아파트 0채.
    wide = wide.fillna(0.0).reset_index()

    def ratio(num: str, den: str) -> pd.Series:
        """분자 0은 정상값이고, 분모 0일 때만 비율이 정의되지 않는다."""
        d = wide[den]
        return (wide[num] / d.where(d > 0)).astype(float)

    wide["elderly_ratio"] = ratio("elderly", "pop")
    wide["single_ratio"] = ratio("single", "households")
    wide["apt_ratio"] = ratio("apt", "houses")
    wide["nonapt_ratio"] = 1.0 - wide["apt_ratio"]
    return wide


@dataclass
class CallReport:
    """119신고 집계의 감사 기록 — 시도 클리핑이 실제로 한 일을 격자 수로 표시.

    PoC 14배 팽창(서울 신고 격자 34,037 vs 이론 2,420)은 화재 상품이 아닌 이 신고 상품의 함정 —
    그래서 대조를 여기 배치.
    """

    sido: str
    files: int
    rows_raw: int
    rows_no_grid: int
    rows_out_of_sido: int
    grids_before_clip: int
    grids_after_clip: int
    # 연도별 (원본 행수, 격자 부여 행수) — 두 종류의 드리프트를 분리해 보기 위한 것.
    by_year: dict[int, tuple[int, int]] = field(default_factory=dict)

    def render(self) -> str:
        def pct(n: int) -> str:
            return f"{100.0 * n / self.rows_raw:.1f}%" if self.rows_raw else "—"

        infl = (
            self.grids_before_clip / self.grids_after_clip if self.grids_after_clip else float("nan")
        )
        lines = [
            f"■ 119신고 {self.sido} — {self.files}개 파일 · 원본 {self.rows_raw:,}행",
            f"    격자 미부여 {self.rows_no_grid:,} ({pct(self.rows_no_grid)})",
            f"    시도 경계 밖 {self.rows_out_of_sido:,} ({pct(self.rows_out_of_sido)})",
            f"    1km 격자 수 {self.grids_before_clip:,} → {self.grids_after_clip:,} "
            f"(클리핑 전이 {infl:.1f}배)",
        ]
        if self.by_year:
            lines.append("    연도별 원본 vs 격자부여율 — 커버리지 드리프트 확인용")
            for y in sorted(self.by_year):
                raw, geo = self.by_year[y]
                cov = 100.0 * geo / raw if raw else 0.0
                lines.append(f"      {y}  원본 {raw:>9,}  격자부여 {cov:5.1f}%")
        return "\n".join(lines)


def load_call_counts(
    sido: str, *, years: tuple[int, ...] | None = None
) -> tuple[pd.DataFrame, CallReport]:
    """119신고를 격자×연도 단위 건수로 집계.

    건별 원본은 시도당 수백만 행이라 DataFrame 미보유, 파일마다 즉시 집계.
    반환 컬럼: `grid1k` · `year` · `total` · `fire`
    """
    frames: list[pd.DataFrame] = []
    files = _call_files(sido)
    rows_raw = rows_no_grid = rows_out = 0
    grids_before: set[str] = set()
    by_year: dict[int, tuple[int, int]] = {}
    for src in files:
        raw = read_csv_kr(src, usecols=lambda c: c in CALL_USECOLS)
        if years is not None and not raw.empty:
            raw = raw.loc[raw["DCLR_YR"].isin(years)]
        if raw.empty:
            continue
        rows_raw += len(raw)
        gid = nfc_series(raw["GRID_ID"].astype("string"))
        # 격자 미부여 신고(서울 22.5%·전북 41.3%)는 집계 불가 — 위치가 없으면 셀에 못 얹는다.
        ok = gid.str.match(GRID500_PATTERN, na=False)
        rows_no_grid += int((~ok).sum())

        # 연도별 커버리지 별도 기록 — 격자 부여율 연도차 존재(부산 2020 27%→2021 65%),
        # 격자 기준 건수만 보면 분류 정책 단절과 커버리지 변화가 혼재(손실 사유 분리와 같은 이유).
        for y, grp in raw.groupby(raw["DCLR_YR"].astype(int)):
            prev = by_year.get(int(y), (0, 0))
            by_year[int(y)] = (prev[0] + len(grp), prev[1] + int(ok.loc[grp.index].sum()))

        raw, gid = raw.loc[ok], gid.loc[ok]
        grids_before |= set(gid.map(grid500_to_1km).unique())

        kept = clip_to_sido(raw.assign(GRID_ID=gid), sido)
        rows_out += len(raw) - len(kept)
        agg = pd.DataFrame(
            {
                "grid1k": kept["GRID_ID"].map(grid500_to_1km),
                "year": kept["DCLR_YR"].astype(int),
                "fire": kept["EMRG_RSCU_ASSRT_NM"].eq(CALL_FIRE).astype(int),
            }
        )
        frames.append(
            agg.groupby(["grid1k", "year"], as_index=False).agg(
                total=("fire", "size"), fire=("fire", "sum")
            )
        )
    if not frames:
        raise DataTrapError(f"119신고 원본 없음: {sido} ({CALL_DIR})")
    out = (
        pd.concat(frames, ignore_index=True)
        .groupby(["grid1k", "year"], as_index=False)
        .agg(total=("total", "sum"), fire=("fire", "sum"))
    )
    report = CallReport(
        sido=sido,
        files=len(files),
        rows_raw=rows_raw,
        rows_no_grid=rows_no_grid,
        rows_out_of_sido=rows_out,
        grids_before_clip=len(grids_before),
        grids_after_clip=int(out["grid1k"].nunique()),
        by_year=by_year,
    )
    return out, report


def yearly_totals(counts: pd.DataFrame) -> dict[int, float]:
    """연도별 총 신고량 — 2021 계단식 급증을 눈으로 확인하는 용도."""
    s = counts.groupby("year")["total"].sum()
    return {int(y): float(v) for y, v in s.items()}


def year_share(counts: pd.DataFrame) -> dict[int, float]:
    """연도별 상대 비중 — 분류 정책 단절은 건수가 아닌 기준 변경이므로 시계열 가중 전 연도 내 상대값 변환(ADR-008 §8)."""
    return normalize_year_counts(yearly_totals(counts))


def silent_activity(counts: pd.DataFrame, *, min_total: int = SILENT_MIN_TOTAL) -> pd.DataFrame:
    """'활동 있는 침묵' 격자 — 총신고 min_total 이상인데 화재신고 0.

    총신고량이 '안전'과 '무관측'을 구별하는 기준 — 화재 0이 안전인지 무관측인지 총신고량으로
    가려 무관측 후보만 큐 승격 대상으로 남김.
    """
    g = counts.groupby("grid1k", as_index=False).agg(total=("total", "sum"), fire=("fire", "sum"))
    return g.loc[(g["total"] >= min_total) & (g["fire"] == 0)].sort_values(
        "total", ascending=False, ignore_index=True
    )
