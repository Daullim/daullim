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
# 실측: 플랫폼 상품(476·462)=UTF-8-SIG · 소방청 전국/SGIS=cp949 — chardet 자동감지 금지(재현성 붕괴)
ENCODINGS_KR = ("utf-8-sig", "cp949")


def read_csv_kr(path: str | Path, **kwargs) -> pd.DataFrame:
    """한국 공공데이터 CSV UTF-8-SIG→cp949 순 읽기 처리."""
    path = Path(path)
    if not path.exists():
        raise DataTrapError(
            f"원본 없음: {path}\ndata/README.md의 배치 경로·출처를 확인하라."
        )
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
    """산출물 UTF-8(BOM 없음) 쓰기 — BE COPY·git diff 호환."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False, encoding="utf-8", **kwargs)
    return path


# ── 2. 한글 정규화 ──────────────────────────────────────────────────────
# 실측: fire/SGIS 파일명 NFD · call119는 NFC — 혼재 시 glob/조인 조용히 0건(실측 2회)


def nfc(value: str) -> str:
    """비교·조인 전 NFC 강제."""
    return unicodedata.normalize("NFC", value)


def nfc_series(s: pd.Series) -> pd.Series:
    return s.map(lambda v: nfc(v) if isinstance(v, str) else v)


def glob_kr(root: str | Path, pattern: str) -> list[Path]:
    """파일명 정규화 혼재 대응 glob.

    Path.glob은 NFD 파일명을 NFC 패턴으로 못 찾음 — 전체 순회 후 NFC 비교.
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
# 실측 2026-08-04: HR_UNIT_HUM(0.1~17.1,충전3%)↔HR_UNIT_SNWFL(7~100,충전100%) 습도·적설 스왑
# 범위검사만으론 미탐지(0.1~17이 습도 0~100 안) → 충전율 리포트가 실탐지 수단, 검증과 항상 병행
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
    """범위 위반 시 fail-fast, 통과해도 충전율 리포트 반환."""
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
    """존 프리픽스 화이트리스트 기반 시도 경계 밖 격자 제거."""
    if sido not in ZONE_PREFIX:
        raise DataTrapError(f"존 프리픽스 미등록 시도: {sido!r} (등록: {list(ZONE_PREFIX)})")
    prefixes = ZONE_PREFIX[sido]
    codes = nfc_series(df[grid_col].astype("string"))
    keep = codes.str.startswith(prefixes, na=False)
    return df.loc[keep].copy()


# ── 6. 격자 조인 (500m → 1km 문자열 유도) ───────────────────────────────
# 형식: 국토부 500m=존2+숫자2+소문자1+숫자2+소문자1('다사46a41a') / SGIS 1km=존2+숫자4('다사4641')
# 검증(2026-08-04, 서울 2023 화재): 5,646/5,646=100.00% SGIS 경계 격자 적중
# ⚠️ 대조 상대는 경계 SHP(8,609셀) — 인구통계(7,008셀) 대조 시 빠지는 9셀은 유도 실패 아닌 무인구=NO_POP 신호(§2-2)
GRID500_RE = re.compile(r"^(?P<zone>..)(?P<x>\d{2})[a-z](?P<y>\d{2})[a-z]$")


def grid500_to_1km(grid_id: str) -> str:
    """'다사46a41a' → '다사4641', 좌표 경로(cell_key) 자체 대조 필수."""
    m = GRID500_RE.match(nfc(str(grid_id).strip()))
    if not m:
        raise DataTrapError(f"500m 격자 ID 형식 아님: {grid_id!r}")
    return f"{m['zone']}{m['x']}{m['y']}"


# 존 코드 = 100km 셀 '가나다라마바사' 2글자 좌표. 실측 역산(2026-08-04, 화재 3개 시도) 원점:
#   다사(900000,1900000) 마라(1100000,1600000) 마마(1100000,1700000) 다마(900000,1700000) 라마(1000000,1700000) 나마(800000,1700000)
# 일반화: x=700000+i*100000, y=1300000+j*100000 (테스트 6개로 검증)
ZONE_LETTERS = "가나다라마바사"
ZONE_X0, ZONE_Y0 = 700_000, 1_300_000


def zone_origin(zone: str) -> tuple[int, int]:
    """존 코드 2글자 → EPSG:5179 100km 셀 원점."""
    z = nfc(str(zone).strip())
    if len(z) != 2 or any(c not in ZONE_LETTERS for c in z):
        raise DataTrapError(f"존 코드 형식 아님(가~사 2글자): {zone!r}")
    return (
        ZONE_X0 + ZONE_LETTERS.index(z[0]) * 100_000,
        ZONE_Y0 + ZONE_LETTERS.index(z[1]) * 100_000,
    )


GRID1K_RE = re.compile(r"^(?P<zone>..)(?P<x>\d{2})(?P<y>\d{2})$")


def grid1k_centroid(grid1k: str) -> tuple[float, float]:
    """1km 격자 ID → 셀 중심 EPSG:5179 좌표. 커널 계산의 격자 속성 점묘화 입력."""
    m = GRID1K_RE.match(nfc(str(grid1k).strip()))
    if not m:
        raise DataTrapError(f"1km 격자 ID 형식 아님: {grid1k!r}")
    ox, oy = zone_origin(m["zone"])
    return (ox + int(m["x"]) * 1000 + 500.0, oy + int(m["y"]) * 1000 + 500.0)


def coord_to_grid500(lat: float, lng: float, zone: str) -> str:
    """좌표 → 500m 격자 ID. `grid500_to_1km` 문자열 경로 자체 대조용(§4-5) — 불일치 시 좌표계 변환/존 원점 오류 신호."""
    ox, oy = zone_origin(zone)
    x, y = to_5179(lat, lng)
    dx, dy = x - ox, y - oy
    half = lambda d: "a" if d % 1000 < 500 else "b"  # noqa: E731
    return f"{nfc(zone)}{int(dx // 1000):02d}{half(dx)}{int(dy // 1000):02d}{half(dy)}"


def resolve_grid500(lat: float, lng: float, zones: tuple[str, ...]) -> str:
    """좌표 소속 존 판별 후 500m 격자 ID 생성.

    시군구가 100km 존 경계에 걸치면(예: 기장군=마라+마마) zones[0] 고정 오류 —
    dx/dy가 100,000 초과 시 `{:02d}` 자리수 붕괴, `grid500_to_1km`에서야 형식 오류로 실패. 여기서 존 선확정.
    """
    x, y = to_5179(lat, lng)
    for zone in zones:
        ox, oy = zone_origin(zone)
        if 0 <= x - ox < 100_000 and 0 <= y - oy < 100_000:
            return coord_to_grid500(lat, lng, zone)
    raise DataTrapError(
        f"좌표 ({lat}, {lng})가 후보 존 {zones}의 100km 셀 어디에도 속하지 않음"
    )


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
# 2021 중반 화재신고 분류 정책 단절 — 3개 시도 동시 계단식 급증(실화재 통계는 불변), 라벨 드리프트라 시계열 가중 산출 시 필수 고려
YEAR_WEIGHTS: dict[int, float] = {2020: 0.15, 2021: 0.20, 2022: 0.25, 2023: 0.40}


def year_weight(year: int) -> float:
    """정의서 §3-1의 최근가중. 미등록 연도는 0(가중 대상 밖)."""
    return YEAR_WEIGHTS.get(int(year), 0.0)


def normalize_year_counts(counts: dict[int, float]) -> dict[int, float]:
    """연도별 원시 건수를 그 연도 전체 규모로 나눠 라벨 드리프트 제거.

    2021 단절은 건수 증가가 아닌 분류 기준 변경이므로, 연도 내 상대값 변환 후 가중 적용.
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
    """CSV·GeoJSON 동시 산출.

    임시 파일에 전체 기록 후 일괄 rename — 중간 실패 시 버전 어긋난 산출물 잔존 방지(ADR-008 §9).
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
