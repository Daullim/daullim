import { apiGet, apiGetRaw, apiSend, query } from "@/api/client";
import type {
  BuildingDetail,
  BuildingQueueItem,
  CursorPage,
  DashboardSummary,
  Dong,
  GridFeatureCollection,
  GridSummary,
  Sido,
  Sigungu,
  UnitItem,
  LoginResponse,
  SignupResponse,
} from "@/api/types";

/* 지역 — 코드는 행정표준코드 (docs/openapi.yaml C-1~C-3) */

export const getSidos = (signal?: AbortSignal) => apiGet<Sido[]>("/regions/sidos", signal);

export const getSigungus = (sidoCd: string, signal?: AbortSignal) =>
  apiGet<Sigungu[]>(`/regions/sigungus${query({ sidoCd })}`, signal);

export const getDongs = (sigunguCd: string, signal?: AbortSignal) =>
  apiGet<Dong[]>(`/regions/dongs${query({ sigunguCd })}`, signal);

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

/* 지도·격자 (D-1·D-3) */

/** 정적 GeoJSON — 봉투 없이 온다. 동 필터는 summary의 gridId로 화면에서 조인한다 */
export const getGrids = (signal?: AbortSignal) =>
  apiGetRaw<GridFeatureCollection>("/grids", signal);

export const getGridSummary = (dongCd: string, signal?: AbortSignal) =>
  apiGet<GridSummary[]>(`/grids/summary${query({ dongCd })}`, signal);

/* 관제 (H-3) */

export const getDashboardSummary = (sigunguCd?: string, signal?: AbortSignal) =>
  apiGet<DashboardSummary>(`/dashboard/summary${query({ sigunguCd })}`, signal);

/* 인증 — 이 둘만 토큰 없이 열려 있다 */

export const login = (loginId: string, password: string, signal?: AbortSignal) =>
  apiSend<LoginResponse>("POST", "/auth/login", { loginId, password }, signal);

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
