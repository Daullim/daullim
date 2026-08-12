import { ApiError, apiDelete, apiGet, apiGetRaw, apiSend, query } from "@/api/client";
import type {
  AdminDongBoundaryFeatureCollection,
  BuildingDetail,
  BuildingQueueItem,
  CurrentUser,
  CursorPage,
  DashboardComposition,
  DashboardSummary,
  Dong,
  GridFeatureCollection,
  GridSummary,
  Sido,
  Sigungu,
  UnitItem,
  VisitDayCount,
  VisitDetail,
  VisitListItem,
  VisitSaveResult,
  VisitSubmitRequest,
  VisitSummary,
  LoginResponse,
  SignupResponse,
} from "@/api/types";

/* 지역 — 코드는 행정표준코드 (docs/openapi.yaml C-1~C-3) */

export const getSidos = (signal?: AbortSignal) => apiGet<Sido[]>("/regions/sidos", signal);

export const getSigungus = (sidoCd: string, signal?: AbortSignal) =>
  apiGet<Sigungu[]>(`/regions/sigungus${query({ sidoCd })}`, signal);

export const getDongs = (sigunguCd: string, signal?: AbortSignal) =>
  apiGet<Dong[]>(`/regions/dongs${query({ sigunguCd })}`, signal);

/** B1 동 선택 지도용 행정동 경계 — 정적 GeoJSON이라 봉투 없이 온다 */
export const getAdminDongBoundaries = async (signal?: AbortSignal) => {
  try {
    return await apiGetRaw<AdminDongBoundaryFeatureCollection>("/regions/boundaries", signal);
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    if (e instanceof ApiError && [401, 403].includes(e.status)) throw e;

    const res = await fetch("/admin-dong-boundaries.geojson", { signal });
    if (!res.ok) throw e;
    return (await res.json()) as AdminDongBoundaryFeatureCollection;
  }
};

/* 대상건물 (E-1·E-2) */

export interface QueueParams {
  dongCd: string;
  /** 1km 격자 코드 — 500m를 주면 0건이 된다 */
  gridId?: string;
  /** 주소 부분검색. 공백 제거는 서버가 한다 */
  q?: string;
  cursor?: string;
  /** 기본 20 · 최대 100 */
  size?: number;
}

export const getBuildingQueue = (params: QueueParams, signal?: AbortSignal) =>
  apiGet<CursorPage<BuildingQueueItem>>(`/buildings/queue${query({ ...params })}`, signal);

export const getBuilding = (buildingId: number, signal?: AbortSignal) =>
  apiGet<BuildingDetail>(`/buildings/${buildingId}`, signal);

/* 세대 (F-1·F-2) */

export const getUnits = (buildingId: number, signal?: AbortSignal) =>
  apiGet<UnitItem[]>(`/buildings/${buildingId}/units`, signal);

/** `hoNmSourceCd='field'` 행만 허용된다 — 그 외는 403, 건물 내 중복은 409 */
export const renameUnit = (unitId: number, hoNm: string, signal?: AbortSignal) =>
  apiSend<UnitItem>("PATCH", `/units/${unitId}`, { hoNm }, signal);

/* 점검 기록 조회 (G-2 · H-1) */

export interface VisitQueryParams {
  /** `me`면 서버가 토큰의 주인으로 푼다 */
  officerId?: string;
  unitId?: number;
  /** YYYYMMDD, 포함 */
  from?: string;
  to?: string;
  consentCd?: string;
  /** 관할 스코프 — 관제 5. 실적 통계의 일자별 표가 쓴다 */
  sigunguCd?: string;
  dongCd?: string;
  cursor?: string;
  /** 기본 20 · 최대 100 */
  size?: number;
}

export const getVisits = (params: VisitQueryParams, signal?: AbortSignal) =>
  apiGet<CursorPage<VisitListItem>>(`/visits${query({ ...params })}`, signal);

/**
 * 달력 마킹용 일자별 건수.
 *
 * 목록은 커서로 잘려 오므로 이걸로 점을 찍어야 한다 — 첫 페이지만 보고 찍으면 달력이 거짓말을 한다.
 */
export const getVisitCalendar = (
  params: {
    from: string;
    to: string;
    officerId?: string;
    /** 관할 스코프 — `/records`는 `officerId=me`, 관제 5. 실적 통계는 이쪽으로 부른다 */
    sigunguCd?: string;
    dongCd?: string;
  },
  signal?: AbortSignal,
) => apiGet<VisitDayCount[]>(`/visits/calendar${query({ ...params })}`, signal);

/**
 * 기간 방문 집계. '오늘'은 `from`·`to`에 같은 날을 넣어 부른다 —
 * 오늘의 경계가 KST 달력일이라 서버가 정하지 않고 화면이 자기 날짜를 보낸다.
 */
export const getVisitSummary = (
  params: {
    from: string;
    to: string;
    officerId?: string;
    consentCd?: string;
    /** 관제 5. 실적 통계의 관할 축. `dongCd`와 함께 주면 둘 다 걸린다 */
    sigunguCd?: string;
    dongCd?: string;
  },
  signal?: AbortSignal,
) => apiGet<VisitSummary>(`/visits/summary${query({ ...params })}`, signal);

export const getVisit = (visitId: number, signal?: AbortSignal) =>
  apiGet<VisitDetail>(`/visits/${visitId}`, signal);

export const submitVisit = (
  unitId: number,
  body: VisitSubmitRequest,
  idempotencyKey: string,
  signal?: AbortSignal,
) =>
  apiSend<VisitSaveResult>(
    "POST",
    `/units/${unitId}/visits`,
    body,
    signal,
    { "Idempotency-Key": idempotencyKey },
  );

/* 지도·격자 (D-1·D-3) */

/** 정적 GeoJSON — 봉투 없이 온다. 동 필터는 summary의 gridId로 화면에서 조인한다 */
export const getGrids = (signal?: AbortSignal) =>
  apiGetRaw<GridFeatureCollection>("/grids", signal);

export const getGridSummary = (dongCd: string, signal?: AbortSignal) =>
  apiGet<GridSummary[]>(`/grids/summary${query({ dongCd })}`, signal);

/* 관제 (H-3) */

export const getDashboardSummary = (sigunguCd?: string, signal?: AbortSignal) =>
  apiGet<DashboardSummary>(`/dashboard/summary${query({ sigunguCd })}`, signal);

export const getDashboardComposition = (
  params: { sidoCd?: string; sigunguCd?: string } = {},
  signal?: AbortSignal,
) => apiGet<DashboardComposition>(`/dashboard/composition${query({ ...params })}`, signal);

/* 인증 — login·signup만 토큰 없이 열려 있다 */

export const login = (loginId: string, password: string, signal?: AbortSignal) =>
  apiSend<LoginResponse>("POST", "/auth/login", { loginId, password }, signal);

/** 로그인한 사용자 — 상단바·드로어가 마운트마다 부른다 */
export const getCurrentUser = (signal?: AbortSignal) =>
  apiGet<CurrentUser>("/auth/me", signal);

/**
 * 회원탈퇴 — 비가역. 서버는 계정을 비활성화하고 점검 이력은 남긴다.
 *
 * 성공(204)한 뒤에만 토큰을 지운다. 실패했는데 지우면 계정은 살아 있고 세션만 끊겨,
 * 사용자가 탈퇴됐다고 오해한다.
 */
export const withdraw = (signal?: AbortSignal) => apiDelete("/auth/me", signal);

export interface SignupParams {
  loginId: string;
  password: string;
  name: string;
  /** `010-1234-5678` 정규형 — 서버 CHECK가 형식을 강제한다 */
  phone: string;
  /** ISO 날짜 (YYYY-MM-DD) */
  birthOn: string;
}

export const signup = (params: SignupParams, signal?: AbortSignal) =>
  apiSend<SignupResponse>("POST", "/auth/signup", params, signal);
