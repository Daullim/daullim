"""ADR-008 데이터 함정 9종 — 모든 스크립트가 경유하는 단일 관문.

각 함수 옆의 실측 근거는 PoC(P1·P2)와 2026-08-04 재고 검수에서 나온 것이다.
규칙을 우회하고 싶어지면 `data/README.md` § 검수 실측을 먼저 읽어라.
"""

from __future__ import annotations

import math
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path

import pandas as pd
from pyproj import Transformer

# ── 경로 ────────────────────────────────────────────────────────────────
REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_ROOT = REPO_ROOT / "data"
SEED_ROOT = REPO_ROOT / "seed"


class DataTrapError(Exception):
    """함정 규칙 위반 — fail-fast의 공통 부모(ADR-008 결과: 무결성 > 편의)."""


# ── 1. 인코딩 ───────────────────────────────────────────────────────────
# 실측: 플랫폼 상품(476·462) = UTF-8-SIG / 소방청 전국·SGIS = cp949.
# 자동 감지(chardet)는 금지 — 표본에 따라 결과가 흔들려 재현성이 깨진다.
ENCODINGS_KR = ("utf-8-sig", "cp949")


def read_csv_kr(path: str | Path, **kwargs) -> pd.DataFrame:
    """한국 공공데이터 CSV를 UTF-8-SIG → cp949 순서로 시도해 읽는다."""
    path = Path(path)
    last: UnicodeDecodeError | None = None
    for enc in ENCODINGS_KR:
        try:
            return pd.read_csv(path, encoding=enc, **kwargs)
        except UnicodeDecodeError as exc:
            last = exc
    raise DataTrapError(
        f"{path.name}: {ENCODINGS_KR} 어느 것으로도 디코드 실패. 원본 인코딩을 확인하라."
    ) from last


def write_csv_kr(df: pd.DataFrame, path: str | Path, **kwargs) -> Path:
    """산출물은 UTF-8(BOM 없음)로 쓴다 — BE COPY와 git diff 양쪽을 위해."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False, encoding="utf-8", **kwargs)
    return path


# ── 2. 한글 정규화 ──────────────────────────────────────────────────────
# 실측: fire·SGIS 원본 파일명은 NFD, call119는 NFC. 섞인 채로 glob/조인하면
# 예외 없이 조용히 0건이 된다(이번 검수 중 2회 실발생).


def nfc(value: str) -> str:
    """비교·조인 전 NFC 강제."""
    return unicodedata.normalize("NFC", value)


def nfc_series(s: pd.Series) -> pd.Series:
    return s.map(lambda v: nfc(v) if isinstance(v, str) else v)


def glob_kr(root: str | Path, pattern: str) -> list[Path]:
    """파일명 정규화가 섞여 있어도 매칭되는 glob.

    `Path.glob`은 NFD 파일명을 NFC 패턴으로 찾지 못한다. 전체를 훑어 NFC로 비교한다.
    """
    root = Path(root)
    want = nfc(pattern)
    out = [p for p in root.rglob("*") if p.is_file() and _match_nfc(p.name, want)]
    return sorted(out, key=lambda p: nfc(p.name))


def _match_nfc(name: str, pattern: str) -> bool:
    from fnmatch import fnmatch

    return fnmatch(nfc(name), pattern)


# ── 3. 월 필드 ──────────────────────────────────────────────────────────
def normalize_month(value) -> str | None:
    """비패딩 '1'~'9' → '01'~'09'. 정수·실수·공백 입력도 받는다."""
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return None
    text = str(value).strip()
    if text == "":
        return None
    if not text.lstrip("-").isdigit():
        raise DataTrapError(f"월 필드에 숫자가 아닌 값: {value!r}")
    month = int(text)
    if not 1 <= month <= 12:
        raise DataTrapError(f"월 범위를 벗어남: {value!r}")
    return f"{month:02d}"


# ── 4. 값 범위 검증 + 충전율 리포트 ─────────────────────────────────────
# 실측(2026-08-04): 2023 화재 상품에서 습도·적설이 뒤바뀌어 있다.
#   HR_UNIT_HUM   0.1~17.1  충전 3%   ← 값도 충전율도 습도로 볼 수 없다
#   HR_UNIT_SNWFL 7~100     충전 100% ← 분포가 습도에 가깝다
# 주의: 범위 검사만으로는 이 스왑이 안 잡힌다(0.1~17은 습도 0~100 안이다).
# **충전율 리포트가 실제 탐지 수단**이므로 검증과 항상 함께 낸다.
RANGE_SPEC_WEATHER: dict[str, tuple[float | None, float | None]] = {
    "HR_UNIT_HUM": (0, 100),  # 습도 %
    "HR_UNIT_SNWFL": (0, None),  # 적설 cm — 음수 불가
    "HR_UNIT_RN": (0, None),  # 강수 mm
    "HR_UNIT_WSPD": (0, None),  # 풍속 m/s
}


@dataclass(frozen=True)
class FillReport:
    """컬럼별 충전율(%). 스왑·개방편차 탐지의 1차 신호."""

    name: str
    rows: int
    fill_pct: dict[str, float]

    def render(self) -> str:
        lines = [f"[충전율] {self.name} — {self.rows:,}행"]
        for col, pct in sorted(self.fill_pct.items(), key=lambda kv: kv[1]):
            lines.append(f"  {col:<24} {pct:6.1f}%")
        return "\n".join(lines)


def fill_report(df: pd.DataFrame, columns: list[str], *, name: str) -> FillReport:
    present = [c for c in columns if c in df.columns]
    rows = len(df)
    pct = {
        c: (round(100.0 * df[c].notna().sum() / rows, 1) if rows else 0.0)
        for c in present
    }
    return FillReport(name=name, rows=rows, fill_pct=pct)


def validate_ranges(
    df: pd.DataFrame,
    spec: dict[str, tuple[float | None, float | None]],
    *,
    name: str,
) -> FillReport:
    """범위 위반 시 fail-fast. 통과해도 충전율 리포트를 돌려준다."""
    violations: list[str] = []
    for col, (lo, hi) in spec.items():
        if col not in df.columns:
            continue
        values = pd.to_numeric(df[col], errors="coerce").dropna()
        if values.empty:
            continue
        if lo is not None and values.min() < lo:
            violations.append(f"{col}: 최소 {values.min()} < 허용 {lo}")
        if hi is not None and values.max() > hi:
            violations.append(f"{col}: 최대 {values.max()} > 허용 {hi}")
    if violations:
        raise DataTrapError(f"{name} 값 범위 위반\n  " + "\n  ".join(violations))
    return fill_report(df, list(spec), name=name)


# ── 5. 시도 경계 클리핑 ─────────────────────────────────────────────────
# 실측: 미클리핑 시 서울 신고 격자가 이론치(2,420)의 14배(34,037)로 팽창한다.
ZONE_PREFIX: dict[str, tuple[str, ...]] = {
    "서울": ("다사",),
    "부산": ("마라", "마마"),
    "전북": ("나마", "다마", "라마"),
}


def clip_to_sido(df: pd.DataFrame, sido: str, *, grid_col: str = "GRID_ID") -> pd.DataFrame:
    """존 프리픽스 화이트리스트로 시도 경계 밖 격자를 제거한다."""
    if sido not in ZONE_PREFIX:
        raise DataTrapError(f"존 프리픽스 미등록 시도: {sido!r} (등록: {list(ZONE_PREFIX)})")
    prefixes = ZONE_PREFIX[sido]
    codes = nfc_series(df[grid_col].astype("string"))
    keep = codes.str.startswith(prefixes, na=False)
    return df.loc[keep].copy()


# ── 6. 격자 조인 (500m → 1km 문자열 유도) ───────────────────────────────
# 형식 실측: 국토부 500m = 존2 + 숫자2 + 소문자1 + 숫자2 + 소문자1 (예 '다사46a41a')
#            SGIS   1km  = 존2 + 숫자4                          (예 '다사4641')
# 검증(2026-08-04, 서울 2023 화재): 5,646/5,646 = 100.00%가 SGIS 경계 격자에 적중.
# ⚠️ 대조 상대는 **경계 SHP(8,609셀)**여야 한다. 인구통계(7,008셀)로 대조하면
#    9셀이 빠지는데 그건 유도 실패가 아니라 **무인구 격자 = NO_POP 신호**다(§2-2).
GRID500_RE = re.compile(r"^(?P<zone>..)(?P<x>\d{2})[a-z](?P<y>\d{2})[a-z]$")


def grid500_to_1km(grid_id: str) -> str:
    """'다사46a41a' → '다사4641'. 좌표 경로(cell_key)와 반드시 자체 대조할 것."""
    m = GRID500_RE.match(nfc(str(grid_id).strip()))
    if not m:
        raise DataTrapError(f"500m 격자 ID 형식 아님: {grid_id!r}")
    return f"{m['zone']}{m['x']}{m['y']}"


# ── 7. 좌표계 ───────────────────────────────────────────────────────────
# 저장·교환 EPSG:4326 / 계산 EPSG:5179(UTM-K). 변수 접미사 _4326 / _5179 강제.
CRS_STORAGE = "EPSG:4326"
CRS_COMPUTE = "EPSG:5179"
CELL_SIZE_M = 500  # ADR-008 §7 공통 셀 스냅

_TO_5179 = Transformer.from_crs(CRS_STORAGE, CRS_COMPUTE, always_xy=True)
_TO_4326 = Transformer.from_crs(CRS_COMPUTE, CRS_STORAGE, always_xy=True)


def to_5179(lat: float, lng: float) -> tuple[float, float]:
    """(위도, 경도) → (x_5179, y_5179). 인자 순서 주의 — always_xy는 (경도, 위도)."""
    x, y = _TO_5179.transform(lng, lat)
    return x, y


def to_4326(x_5179: float, y_5179: float) -> tuple[float, float]:
    """(x, y) → (위도, 경도)."""
    lng, lat = _TO_4326.transform(x_5179, y_5179)
    return lat, lng


def cell_key(lat: float, lng: float, *, size_m: int = CELL_SIZE_M) -> tuple[int, int]:
    """좌표 → 공통 셀 키. 격자 코드 대 코드 매핑 금지의 대안 경로(§4-5)."""
    x, y = to_5179(lat, lng)
    return (math.floor(x / size_m) * size_m, math.floor(y / size_m) * size_m)


# ── 8. 연도 정규화 ──────────────────────────────────────────────────────
# 2021년 중반 화재신고 분류 정책 단절로 3개 시도가 동시 계단식 급증한다
# (실화재 통계는 불변). 라벨 드리프트이므로 시계열 가중 산출 시 필수.
YEAR_WEIGHTS: dict[int, float] = {2020: 0.15, 2021: 0.20, 2022: 0.25, 2023: 0.40}


def year_weight(year: int) -> float:
    """정의서 §3-1의 최근가중. 미등록 연도는 0(가중 대상 밖)."""
    return YEAR_WEIGHTS.get(int(year), 0.0)


def normalize_year_counts(counts: dict[int, float]) -> dict[int, float]:
    """연도별 원시 건수를 그 연도의 전체 규모로 나눠 라벨 드리프트를 제거한다.

    2021 단절은 '건수 자체가 늘어난' 게 아니라 '분류 기준이 바뀐' 것이므로,
    연도 내 상대값으로 바꾼 뒤에 가중을 곱해야 한다.
    """
    total = sum(counts.values())
    if total <= 0:
        return {y: 0.0 for y in counts}
    return {y: v / total for y, v in counts.items()}


# ── 9. 산출 원자성 ──────────────────────────────────────────────────────
GEOJSON_COORD_NDIGITS = 5


def round_coords(obj):
    """GeoJSON 좌표를 5자리로 반올림 — 파일 크기와 git diff 안정성."""
    if isinstance(obj, list):
        return [round_coords(v) for v in obj]
    if isinstance(obj, (int, float)) and not isinstance(obj, bool):
        return round(float(obj), GEOJSON_COORD_NDIGITS)
    return obj


def write_outputs_atomic(writers: dict[Path, "callable"]) -> list[Path]:
    """CSV와 GeoJSON을 한 실행에서 함께 낸다.

    임시 파일에 전부 쓴 뒤 마지막에 일괄 rename한다 — 중간 실패 시
    '버전이 어긋난 CSV와 GeoJSON'이 남는 것을 막는다(ADR-008 §9).
    """
    temps: list[tuple[Path, Path]] = []
    try:
        for final, write in writers.items():
            final = Path(final)
            final.parent.mkdir(parents=True, exist_ok=True)
            tmp = final.with_suffix(final.suffix + ".tmp")
            write(tmp)
            temps.append((tmp, final))
        for tmp, final in temps:
            tmp.replace(final)
    except Exception:
        for tmp, _ in temps:
            tmp.unlink(missing_ok=True)
        raise
    return [final for _, final in temps]
