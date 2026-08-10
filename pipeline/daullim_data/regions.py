"""지역 코드 체계 3종의 단일 해석처.

같은 시군구를 가리키는 코드가 출처마다 다르고, 섞으면 **예외가 아니라 빈 결과**가 온다.
그래서 코드는 스크립트에 흩뿌리지 않고 여기서만 체계명을 명시해 꺼내 쓴다
(좌표의 `_4326`/`_5179` 접미사 규약과 같은 발상).

| 체계 | 관악구 | 임실군 | 쓰는 곳 |
|---|---|---|---|
| `kostat` 통계청(SGIS) | 11210 | 35550 | SGIS 격자 통계 — 도농 판별·V⊥ |
| `mois`   행정표준(법정동) | 11620 | 52750 | 건축HUB API, **DB `buildings.sigungu_cd`** |
| `zone`   격자 존 | 다사 | 다마 | 화재·신고 `GRID_ID`, SGIS 경계 |

실측 함정(2026-08-04):
- 시도 2자리는 **서울만 우연히 일치**한다(11). 부산 21↔26, 전북 35↔52.
  서울로 테스트하면 통과하고 전북에서 깨진다.
- 통계청 부산 `21`은 행정표준코드에도 **존재**한다 — 폐지된 '부산직할시'.
  즉 "없는 코드"로 튕기지 않고 폐지 코드에 맞아 들어간다.
  → 검증은 "존재하는가"가 아니라 **"현행인가(폐지여부='존재')"**로 건다.
- 전북은 2024-01-18 전북특별자치도 출범으로 45(폐지) → 52. 임실군 45750 → **52750**.
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import pandas as pd

from .utils import DATA_ROOT, DataTrapError, nfc, read_csv_kr

BJDONG_CSV = DATA_ROOT / "codes" / "국토교통부_법정동코드_20250805.csv"

ACTIVE = "존재"
ABOLISHED = "폐지"


@dataclass(frozen=True)
class Region:
    """시연 시군구 하나에 대한 3종 코드."""

    key: str
    name: str
    sido: str
    kostat: str  # 통계청(SGIS) 시군구코드
    mois: str  # 행정표준 시군구코드 — DB 저장값
    zone: tuple[str, ...]  # 격자 존 프리픽스


# ADR-010 시연 지역. 값은 전부 원본 대조 실측이다(SGIS 코드집 / 국토부 법정동코드).
REGIONS: dict[str, Region] = {
    "gwanak": Region(
        key="gwanak",
        name="서울특별시 관악구",
        sido="서울",
        kostat="11210",
        mois="11620",
        zone=("다사",),
    ),
    "imsil": Region(
        key="imsil",
        name="전북특별자치도 임실군",
        sido="전북",
        kostat="35550",
        mois="52750",
        zone=("다마",),
    ),
    "gijang": Region(
        key="gijang",
        name="부산광역시 기장군",
        sido="부산",
        kostat="21510",
        mois="26710",
        # 기장군은 100km 존 경계(마라/마마)에 걸친다 — zone[0] 고정 금지, resolve_grid500() 경유.
        zone=("마라", "마마"),
    ),
    "busanjin": Region(
        key="busanjin",
        name="부산광역시 부산진구",
        sido="부산",
        kostat="21050",
        mois="26230",
        zone=("마라",),
    ),
}

_SYSTEMS = ("kostat", "mois", "zone")


def region(key: str) -> Region:
    if key not in REGIONS:
        raise DataTrapError(f"미등록 시연 지역: {key!r} (등록: {list(REGIONS)})")
    return REGIONS[key]


def sigungu_code(key: str, system: str) -> str | tuple[str, ...]:
    """시군구 코드를 **체계를 명시해서만** 꺼낸다."""
    if system not in _SYSTEMS:
        raise DataTrapError(f"알 수 없는 코드 체계: {system!r} (허용: {_SYSTEMS})")
    return getattr(region(key), system)


# ── 법정동코드 원본 ─────────────────────────────────────────────────────
@lru_cache(maxsize=1)
def load_bjdong(path: str | Path | None = None) -> pd.DataFrame:
    """국토부 법정동코드 전체(폐지분 포함)를 읽는다.

    반환 컬럼: `code`(10자리) · `name`(NFC) · `active`(bool)
    """
    src = Path(path) if path else BJDONG_CSV
    if not src.exists():
        raise DataTrapError(
            f"법정동코드 파일 없음: {src}\n"
            "공공데이터포털 15123287에서 받아 data/codes/ 에 둔다(data/README.md 참조)."
        )
    df = read_csv_kr(src, dtype=str)
    df = df.rename(
        columns={"법정동코드": "code", "법정동명": "name", "폐지여부": "status"}
    )
    df["name"] = df["name"].map(lambda v: nfc(v) if isinstance(v, str) else v)
    df["active"] = df["status"].eq(ACTIVE)
    return df[["code", "name", "active"]]


def assert_current_mois(code: str) -> str:
    """행정표준코드가 **현행**인지 확인한다. 폐지·미등록이면 fail-fast.

    통계청 코드를 여기 넣으면 대개 걸린다 — 걸리지 않는 경우(부산 21='부산직할시')를
    잡아내는 게 이 함수의 존재 이유다.
    """
    code = str(code).strip()
    if not code.isdigit() or len(code) not in (2, 5, 10):
        raise DataTrapError(f"행정표준코드 형식 아님(2·5·10자리 숫자): {code!r}")
    df = load_bjdong()
    full = code.ljust(10, "0")
    hit = df.loc[df["code"] == full]
    if hit.empty:
        raise DataTrapError(f"행정표준코드에 없는 값: {code!r} — 통계청 코드를 넣지 않았는지 확인하라.")
    row = hit.iloc[0]
    if not bool(row["active"]):
        raise DataTrapError(
            f"폐지된 행정표준코드: {code!r} = {row['name']}. 현행 코드로 바꿔라."
        )
    return code


def bjdong_codes(key: str, *, include_upper: bool = False) -> list[tuple[str, str]]:
    """시연 시군구의 하위 법정동 목록 → 건축HUB API 순회 단위.

    반환: `(bjdongCd 5자리, 법정동명)` 리스트. 현행(`존재`)만.

    `include_upper=False`면 읍·면 레벨(뒤 2자리 '00')을 제외하고 리 레벨만 남긴다.
    임실군은 읍면(12) + 리(131)가 **둘 다** 코드로 존재해서, 둘 다 호출하면
    중복 수집이 된다. 어느 쪽이 하위를 포함하는지는 실제 응답으로 확인한 뒤 고정한다.
    """
    sgg = region(key).mois
    assert_current_mois(sgg)
    df = load_bjdong()
    sub = df.loc[
        df["active"]
        & df["code"].str.startswith(sgg)
        & ~df["code"].str.endswith("00000")
    ]
    out = [(c[5:], n) for c, n in zip(sub["code"], sub["name"])]
    if not include_upper:
        leaf = [(c, n) for c, n in out if not c.endswith("00")]
        if leaf:
            return leaf
    return out
