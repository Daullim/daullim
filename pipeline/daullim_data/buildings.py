"""건물 마스터 + 세대 생성 — `buildings`·`units` 행 생성.

산출 계약은 `V1__init.sql` DDL. 이 모듈은 대장 유래 컬럼·지오코딩 결과까지 채우고
점수 계열(`score`·`order_key` 등)은 커밋 7의 몫으로 남김.

쓰기 경계는 ADR-015 — `units`는 정적 4컬럼만(`unit_seq`·`ho_nm`·`flr_no`·`ho_nm_source_cd`)
생성, 업무 상태 3컬럼은 미접근.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import pandas as pd

from .apiclient import (
    EAIS_CACHE,
    EXPOS_CACHE,
    GEOCODE_CACHE,
    ApiClient,
    JsonlCache,
    require_key,
)
from .regions import bjdong_codes, region
from .utils import DataTrapError, nfc

TITLE_API = "https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo"
EXPOS_API = "https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposInfo"
VWORLD_API = "https://api.vworld.kr/req/address"

PAGE_SIZE = 100  # 건축HUB numOfRows 최대치

# ── 주택 유형 5분류 ─────────────────────────────────────────────────────
# ⚠️ 표제부는 건축법 상위 범주로만 옴(실측 2,258건 중 세부 명시 11.3%뿐) — 명시값 우선, 없으면 건축법 시행령 기준 추론:
#   · 아파트   = 주택 층수 5개 층 이상 → 스코프 밖(비아파트 사업)이라 제외
#   · 연립주택 = 4개 층 이하 & 바닥면적 합계 660㎡ 초과
#   · 다세대   = 4개 층 이하 & 660㎡ 이하
#   · 다가구   = 단독주택 분류이면서 2가구 이상
# 교차검증: 명시적 '연립주택'(3층·2,179㎡·19세대)이 추론 규칙으로도 row-house로 일치.
APT = "APT"  # DDL 5분류에 없다 = 제외 대상
DETACHED, MULTI_USER, MULTI_FAMILY, ROW_HOUSE, MULTI_UNIT = (
    "detached", "multi-user", "multi-family", "row-house", "multi-unit"
)
ROW_HOUSE_AREA = 660.0
APT_MIN_FLOORS = 5

EXPLICIT = (
    ("아파트", APT),
    ("다세대", MULTI_UNIT),
    ("연립", ROW_HOUSE),
    ("다가구", MULTI_FAMILY),
    ("다중", MULTI_USER),
)


def classify_house(
    main_purpose: str, etc_purpose: str, *, floors: int, total_area: float, families: int
) -> tuple[str | None, str]:
    """→ (유형, 판정근거). 주택이 아니면 (None, '주택 아님')."""
    main, etc = nfc(str(main_purpose or "")), nfc(str(etc_purpose or ""))
    text = f"{etc} {main}"
    for token, kind in EXPLICIT:
        if token in text:
            return kind, "명시"
    if "공동주택" in main:
        if floors >= APT_MIN_FLOORS:
            return APT, "추론(5층+)"
        return (ROW_HOUSE if total_area > ROW_HOUSE_AREA else MULTI_UNIT), "추론(연면적)"
    if "단독" in main or main == "주택":
        return (MULTI_FAMILY if families >= 2 else DETACHED), "추론(가구수)"
    return None, "주택 아님"


# `units` 생성 규칙 — ADR-015. 전유부(C안)로 실호수를 받을 수 있는 유형만 expos를 조회한다.
IMPLICIT_TYPES = (DETACHED, MULTI_USER)  # 1행, ho_nm='본가구'
EXPOS_TYPES = (MULTI_UNIT, ROW_HOUSE)  # 전유부 조회 대상
MAIN_UNIT_NAME = "본가구"


def unit_count_of(house_type: str, *, families: int, households: int, hos: int) -> int:
    """세대수는 유형별로 다른 필드에 담김(실측 확정).

    단독 계열 → `fmlyCnt`(가구수) 94~100% / 공동 계열 → `hhldCnt`(세대수) 100%.
    `hoCnt`는 거의 안 쓰여 보조로만 사용. DDL `unit_count > 0` 요구로 최소 1.

    ⚠️ 단독·다중은 무조건 1 — ADR-015 "1행, `ho_nm='본가구'`" 규정상 `unit_count`도 1이어야
    `units` 행수와 정합. 실측 `fmlyCnt=0`·`hoCnt=16` 단독주택 사례(다가구를 단독 등록한 것으로 추정) —
    보조 규칙을 그대로 두면 "행 1개인데 unit_count 16"으로 검증 붕괴.
    """
    if house_type in IMPLICIT_TYPES:
        return 1
    primary = families if house_type == MULTI_FAMILY else households
    return max(int(primary or 0), int(hos or 0), 1)


# ── 표제부 수집 ─────────────────────────────────────────────────────────
def _items(payload) -> list[dict]:
    try:
        body = payload["response"]["body"]
    except (KeyError, TypeError):
        return []
    items = body.get("items")
    if not items:
        return []
    it = items["item"] if isinstance(items, dict) else items
    return it if isinstance(it, list) else [it]


def fetch_titles(region_key: str, *, client: ApiClient | None = None) -> list[dict]:
    """시연 시군구의 표제부 전량. 법정동 단위로 순회하고 페이지를 끝까지 넘긴다."""
    key = require_key("SERVICE_KEY")
    client = client or ApiClient(JsonlCache(EAIS_CACHE))
    sgg = region(region_key).mois
    out: list[dict] = []
    for bjdong, _name in bjdong_codes(region_key):
        page = 1
        while True:
            payload = client.get_json(
                TITLE_API,
                {
                    "serviceKey": key, "sigunguCd": sgg, "bjdongCd": bjdong,
                    "numOfRows": str(PAGE_SIZE), "pageNo": str(page), "_type": "json",
                },
                cache_key=f"title:{sgg}:{bjdong}:{page}",
            )
            batch = _items(payload)
            out.extend(batch)
            total = int(payload["response"]["body"].get("totalCount") or 0)
            if page * PAGE_SIZE >= total or not batch:
                break
            page += 1
    return out


def fetch_expos(row: dict, *, client: ApiClient | None = None) -> list[dict]:
    """전유부 — 다세대·연립의 실제 호수 조회(C안).

    없으면 빈 리스트 — 세대수만큼 빈 행 생성, `ho_nm_source_cd='field'`로
    현장 입력 대상임을 기록(ADR-015).
    """
    key = require_key("SERVICE_KEY")
    client = client or ApiClient(JsonlCache(EXPOS_CACHE))
    sgg, bjd = row.get("sigunguCd"), row.get("bjdongCd")
    bun, ji = row.get("bun") or "0000", row.get("ji") or "0000"
    payload = client.get_json(
        EXPOS_API,
        {
            "serviceKey": key, "sigunguCd": sgg, "bjdongCd": bjd,
            "platGbCd": str(row.get("platGbCd") or "0"), "bun": bun, "ji": ji,
            "numOfRows": "100", "pageNo": "1", "_type": "json",
        },
        cache_key=f"expos:{sgg}:{bjd}:{bun}:{ji}",
    )
    return _items(payload)


# ── 지오코딩 ────────────────────────────────────────────────────────────
@dataclass
class GeoResult:
    lat: float | None = None
    lng: float | None = None
    admin_dong_cd: str | None = None
    estimated: bool = False


#: 영구 캐시해도 되는 VWorld 응답 상태. `OK`는 성공이고 `NOT_FOUND`는 **그 주소가 없다**는
#: 확정 답이라 다시 물어도 같다. 나머지(`ERROR` — 한도 초과·키 오류·서버 장애)는 **일시적**이라
#: 캐시하면 그 주소가 영원히 실패로 굳는다. HTTP 200으로 오기 때문에 본문을 봐야만 구분된다.
GEOCODE_CACHEABLE_STATUS = frozenset({"OK", "NOT_FOUND"})


def _geocode_cacheable(payload: object) -> bool:
    try:
        return payload["response"]["status"] in GEOCODE_CACHEABLE_STATUS  # type: ignore[index]
    except (KeyError, TypeError):
        return False  # 모양이 다른 응답도 캐시하지 않는다 — 정상 경로가 아니다


def geocode(address: str, *, kind: str = "road", client: ApiClient | None = None) -> GeoResult:
    """VWorld 지오코딩 — 도로명 검색만 행정동코드(`level4AC`) 제공(실측 확인).

    지번 검색은 좌표만 주고 `level4AC` 공란 — 행정동은 별도 보완 필요.
    """
    key = require_key("VWORLD_KEY")
    client = client or ApiClient(JsonlCache(GEOCODE_CACHE))
    payload = client.get_json(
        VWORLD_API,
        {
            "service": "address", "request": "getcoord", "version": "2.0",
            "crs": "epsg:4326", "address": address, "refine": "true", "simple": "false",
            "format": "json", "type": kind, "key": key,
        },
        cache_key=f"vworld:{kind}:{address}",
        cacheable=_geocode_cacheable,
    )
    try:
        resp = payload["response"]
        if resp.get("status") != "OK":
            return GeoResult()
        pt = resp["result"]["point"]
        dong = (resp.get("refined", {}).get("structure", {}) or {}).get("level4AC") or None
        return GeoResult(lat=float(pt["y"]), lng=float(pt["x"]), admin_dong_cd=dong)
    except (KeyError, TypeError, ValueError):
        return GeoResult()


# ── 주소 조립 ───────────────────────────────────────────────────────────
def jibun_address(row: dict) -> str:
    """`platPlc`에는 번지가 없다 — `bun`/`ji`로 조립한다(실측)."""
    base = nfc(str(row.get("platPlc") or "")).strip()
    bun = str(row.get("bun") or "").lstrip("0")
    ji = str(row.get("ji") or "").lstrip("0")
    if not bun:
        return base
    return f"{base} {bun}-{ji}" if ji else f"{base} {bun}"


def road_address(row: dict) -> str:
    return nfc(str(row.get("newPlatPlc") or "")).strip()


# 사용승인일 현실적 하한 — 근대 건축물대장 제도가 20세기라 그 이전은 입력 오류.
# 실측: `09970101`(997년)·`10460101`(1046년) 존재, DDL CHECK는 형식(`^\d{8}$`)만 봐 통과
# → 미필터 시 x₁(연차) 1029년으로 exp(Σβx) 폭발.
USE_APR_MIN_YEAR = 1900


def clean_use_apr_day(value) -> str | None:
    """사용승인일 정규화 — 형식·연도 범위를 둘 다 본다. 위반은 결측으로 돌린다."""
    text = str(value or "").strip()
    if len(text) != 8 or not text.isdigit():
        return None
    year = int(text[:4])
    if not USE_APR_MIN_YEAR <= year <= 2100:
        return None
    return text


@dataclass
class MasterReport:
    region: str
    titles: int
    houses: int
    apartments: int
    non_house: int
    by_type: dict[str, int] = field(default_factory=dict)
    by_basis: dict[str, int] = field(default_factory=dict)
    geocoded_road: int = 0
    geocoded_jibun: int = 0
    geocode_failed: int = 0
    missing_dong: int = 0
    units: int = 0
    units_by_source: dict[str, int] = field(default_factory=dict)

    @property
    def ok(self) -> bool:
        return self.houses > 0 and self.geocode_failed == 0

    def render(self) -> str:
        lines = [
            f"■ {self.region} — 표제부 {self.titles:,}건",
            f"    주택 {self.houses:,} · 아파트 제외 {self.apartments:,} · 주택 아님 {self.non_house:,}",
            "    유형: " + " · ".join(f"{k} {v:,}" for k, v in sorted(self.by_type.items())),
            "    판정: " + " · ".join(f"{k} {v:,}" for k, v in sorted(self.by_basis.items())),
            f"    지오코딩: 도로명 {self.geocoded_road:,} · 지번폴백 {self.geocoded_jibun:,} · "
            f"실패 {self.geocode_failed:,} · 행정동 결측 {self.missing_dong:,}",
            f"    units {self.units:,}행 — "
            + " · ".join(f"{k} {v:,}" for k, v in sorted(self.units_by_source.items())),
        ]
        return "\n".join(lines)


# ── 마스터 조립 ─────────────────────────────────────────────────────────
def _num(v, default=0):
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def build_master(
    region_key: str,
    *,
    titles: list[dict] | None = None,
    geocoder=geocode,
    expos_fetcher=fetch_expos,
) -> tuple[pd.DataFrame, pd.DataFrame, MasterReport]:
    """표제부 → (buildings, units, 리포트).

    점수 계열 컬럼은 채우지 않는다 — 커밋 7의 몫이다.
    """
    reg = region(region_key)
    rows = titles if titles is not None else fetch_titles(region_key)
    rep = MasterReport(region=reg.name, titles=len(rows), houses=0, apartments=0, non_house=0)

    b_rows: list[dict] = []
    u_rows: list[dict] = []
    seen: set[str] = set()

    for r in rows:
        floors = int(_num(r.get("grndFlrCnt")))
        kind, basis = classify_house(
            r.get("mainPurpsCdNm"), r.get("etcPurps"),
            floors=floors, total_area=_num(r.get("totArea")), families=int(_num(r.get("fmlyCnt"))),
        )
        if kind is None:
            rep.non_house += 1
            continue
        if kind == APT:
            rep.apartments += 1
            continue

        bld_key = str(r.get("mgmBldrgstPk") or "").strip()
        if not bld_key or bld_key in seen:
            continue  # PK가 없거나 중복이면 UPSERT 키가 성립하지 않는다
        seen.add(bld_key)

        rep.houses += 1
        rep.by_type[kind] = rep.by_type.get(kind, 0) + 1
        rep.by_basis[basis] = rep.by_basis.get(basis, 0) + 1

        road, jibun = road_address(r), jibun_address(r)
        geo = geocoder(road) if road else GeoResult()
        if geo.lat is not None:
            rep.geocoded_road += 1
        else:
            geo = geocoder(jibun, kind="parcel")
            if geo.lat is not None:
                geo.estimated = True
                rep.geocoded_jibun += 1
        if geo.lat is None:
            rep.geocode_failed += 1
            continue  # lat/lng NOT NULL — 좌표 없이는 단 한 행도 INSERT되지 않는다
        if not geo.admin_dong_cd:
            rep.missing_dong += 1

        units = unit_count_of(
            kind, families=int(_num(r.get("fmlyCnt"))),
            households=int(_num(r.get("hhldCnt"))), hos=int(_num(r.get("hoCnt"))),
        )
        apr = clean_use_apr_day(r.get("useAprDay"))
        b_rows.append({
            "bld_key": bld_key,
            "sido_cd": str(r.get("sigunguCd") or "")[:2],
            "sigungu_cd": str(r.get("sigunguCd") or ""),
            "admin_dong_cd": geo.admin_dong_cd,
            "address": (road or jibun)[:200],
            "lat": round(geo.lat, 6),
            "lng": round(geo.lng, 6),
            "house_type_cd": kind,
            "floor_count": max(floors, 1),  # DDL CHECK floor_count > 0
            "unit_count": units,
            "use_apr_day": apr,  # clean_use_apr_day()가 형식·연도범위를 이미 검증했다
            # 감지기 보급 이력은 통합 대장 부재로 전량 NULL (확정 결정 1)
            "install_day": None, "install_year": None, "detector_model": None,
            "is_estimated": geo.estimated,  # 지오코딩 폴백만 — 유형 추론은 싣지 않는다
            "house_type_basis": basis,
            # ③ x₂ 취약 구조의 입력. DDL 컬럼은 아니고 점수 산출에만 쓴다.
            "struct_nm": nfc(str(r.get("strctCdNm") or "")),
            "roof_nm": nfc(str(r.get("roofCdNm") or "")),
            "_bjdong": r.get("bjdongCd"), "_bun": r.get("bun"), "_ji": r.get("ji"),
            "_plat_gb": r.get("platGbCd"), "_dong_nm": r.get("dongNm"),
        })
        u_rows.extend(_units_for(kind, bld_key, units, r, expos_fetcher, rep))

    buildings = pd.DataFrame(b_rows)
    units_df = pd.DataFrame(u_rows)
    if not buildings.empty:
        buildings, filled = fill_missing_dong(buildings)
        rep.missing_dong = max(rep.missing_dong - filled, 0)
    rep.units = len(units_df)
    return buildings, units_df, rep


def fill_missing_dong(buildings: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    """`admin_dong_cd` 결측을 최근접 건물 값으로 채움 → (보완된 표, 채운 수).

    지번 폴백 응답엔 `level4AC` 없음(실측) — NOT NULL 컬럼이라 비면 그 행 통째로 미적재
    (화면 지역 셀렉터도 이걸로 동작).

    법정동→행정동 역산은 1:다라 불가능하나 바로 옆 건물의 행정동은 거의 확실히 동일 —
    추가 API 호출 0, 공간적으로도 타당. 채운 행은 `is_estimated=true`로 표기해 추정을 화면까지 전파.
    """
    out = buildings.copy()
    missing = out["admin_dong_cd"].isna()
    known = out.loc[~missing]
    if not missing.any() or known.empty:
        return out, 0

    kx = known["lat"].to_numpy(float)
    ky = known["lng"].to_numpy(float)
    codes = known["admin_dong_cd"].to_numpy()
    idx = out.index[missing]
    for i in idx:
        d2 = (kx - float(out.at[i, "lat"])) ** 2 + (ky - float(out.at[i, "lng"])) ** 2
        out.at[i, "admin_dong_cd"] = codes[int(d2.argmin())]
        out.at[i, "is_estimated"] = True
    return out, int(missing.sum())


def _units_for(kind, bld_key, count, title_row, expos_fetcher, rep) -> list[dict]:
    """ADR-015 유형별 생성 규칙."""
    def bump(src):
        rep.units_by_source[src] = rep.units_by_source.get(src, 0) + 1

    if kind in IMPLICIT_TYPES:
        bump("implicit")
        return [{"bld_key": bld_key, "unit_seq": 1, "ho_nm": MAIN_UNIT_NAME,
                 "flr_no": 1, "ho_nm_source_cd": "implicit"}]

    if kind in EXPOS_TYPES:
        try:
            expos = expos_fetcher(title_row)
        except DataTrapError:
            expos = []
        dong = str(title_row.get("dongNm") or "").strip()
        if dong:
            expos = [e for e in expos if str(e.get("dongNm") or "").strip() == dong]
        hos = [e for e in expos if str(e.get("hoNm") or "").strip()]
        names = [nfc(str(e.get("hoNm")).strip()) for e in hos]
        # 전유부 신뢰 조건 — ① 호수 개수 == 표제부 세대수 ② 호수명 중복 없음.
        # 같은 지번 다동 시 '2층201호'가 동마다 반복 입력됨(실측 3.9%) — dongNm 공란이면
        # 동 필터가 안 걸리므로 중복 자체를 신뢰 불가 신호로 처리(DDL ux_units_bld_ho 위반 방지).
        if hos and len(hos) == count and len(set(names)) == len(names):
            out = []
            for seq, e in enumerate(sorted(hos, key=lambda x: str(x.get("hoNm"))), start=1):
                bump("expos")
                flr = e.get("flrNo")
                out.append({"bld_key": bld_key, "unit_seq": seq,
                            "ho_nm": nfc(str(e.get("hoNm")).strip())[:20],
                            "flr_no": int(flr) if flr is not None else None,
                            "ho_nm_source_cd": "expos"})
            return out

    # 다가구, 그리고 전유부를 못 믿는 다세대·연립 → 빈 행 + field
    out = []
    for seq in range(1, count + 1):
        bump("field")
        out.append({"bld_key": bld_key, "unit_seq": seq, "ho_nm": None,
                    "flr_no": None, "ho_nm_source_cd": "field"})
    return out
