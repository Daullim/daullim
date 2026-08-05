/**
 * API 응답 타입 — 계약 정본은 `docs/openapi.yaml`이고 이 파일은 그 손 사본이다.
 * 코드 생성기(openapi-typescript)를 붙이지 않은 이유는 의존성 0을 지키기 위해서다(ADR-005는 도구를
 * 권하지만 3주 MVP에서 10종 타입은 손으로 따라 쓰는 편이 싸다). **계약이 바뀌면 여기도 같이 고친다.**
 */
import type { HouseType, RiskLevel, RxCode, UnitStatus } from "@/config/domain";

/** 커서 페이지네이션 — 마지막 페이지면 nextCursor가 null */
export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

/* ------------------------------------------------------------------ */
/* 지역 — 코드는 행정표준코드다 (시도 2 · 시군구 5 · 행정동 10자리)        */
/* ------------------------------------------------------------------ */

export interface Sido {
  sidoCd: string;
  sidoNm: string;
}

export interface Sigungu {
  sigunguCd: string;
  sigunguNm: string;
  /**
   * 시군구 내 건물의 URBAN·RURAL 다수값(BUFFER·NO_POP 제외).
   * 도농 판별이 격자 단위라 한 시군구에 여러 클래스가 공존한다 —
   * **화면 모드 분기용 대표값이지 개별 건물의 분류가 아니다.**
   */
  regionTypeCd: "URBAN" | "RURAL" | null;
}

export interface Dong {
  dongCd: string;
  dongNm: string;
  /** 세대 수 (`count(units)`) — 평균 위험도와 축이 다르다 */
  householdCount: number;
  /** 건물 평균 점수 (소수 1자리) */
  avgRiskScore: number;
  avgRiskLevelCd: RiskLevel | null;
}

/* ------------------------------------------------------------------ */
/* 대상건물                                                            */
/* ------------------------------------------------------------------ */

export interface BuildingQueueItem {
  buildingId: number;
  /** 위험 + 동선을 종합한 방문 순서. 전역 유일·연속 */
  orderKey: number;
  address: string;
  houseTypeCd: HouseType;
  score: number;
  riskLevelCd: RiskLevel;
  /** 지오코딩이 지번으로 폴백한 행 — 점선 규칙의 근거 */
  isEstimated: boolean;
  /** 실데이터는 "미보급 · 동선 5407" 형태 — 보급이력이 전량 NULL이다 */
  basis: string | null;
  rxCodeCd: RxCode | null;
  lat: number;
  lng: number;
  /** 감지기 보급 통합 대장이 없어 **항상 null** */
  installDay: string | null;
  /** max(units.last_inspected_day) — 첫 점검 저장 전까지 null */
  lastInspectedDay: string | null;
  unitCount: number;
  unitDoneCount: number;
}

export interface BuildingDetail {
  buildingId: number;
  address: string;
  houseTypeCd: HouseType;
  floorCount: number;
  unitCount: number;
  /** null = 대장 미등재 (관악 0.4% · 임실 9.2% 실측) */
  useAprDay: string | null;
  /** 통합 대장 부재 — 항상 null */
  installDay: string | null;
  installYear: number | null;
  detectorModel: string | null;
  lat: number;
  lng: number;
  score: number;
  riskLevelCd: RiskLevel;
  rxCodeCd: RxCode | null;
  isEstimated: boolean;
  isExplore: boolean;
  basis: string | null;
  scoreVersion: string;
  computedAt: string;
}

/* ------------------------------------------------------------------ */
/* 세대                                                                */
/* ------------------------------------------------------------------ */

export interface UnitItem {
  unitId: number;
  unitSeq: number;
  /** null = 미지정. 다가구는 전유부가 없어 호수를 현장에서 받는다 */
  hoNm: string | null;
  flrNo: number | null;
  /** `field`인 행만 호수 수정이 허용된다 */
  hoNmSourceCd: "expos" | "field" | "implicit";
  statusCd: UnitStatus;
  lastInspectedDay: string | null;
}

/* ------------------------------------------------------------------ */
/* 지도·격자                                                           */
/* ------------------------------------------------------------------ */

/** 정적 GeoJSON의 격자 속성 — 원본을 그대로 서빙하므로 snake_case다 */
export interface GridFeatureProperties {
  /** 1km 격자 코드 (다사4641) */
  grid_id: string;
  /** 격자 단위 도농 판별값 — 시군구 대표값과 달리 실제 클래스 그대로다 */
  region_type_cd: "URBAN" | "RURAL" | "BUFFER" | "NO_POP";
  /** SGIS 격자 통계의 **가구 수** — /grids/summary의 targetCount(건물 수)와 축이 다르다 */
  households: number;
  buildings: number;
  avg_score: number;
  risk_level_cd: RiskLevel;
}

export interface GridFeature {
  type: "Feature";
  geometry: { type: "Polygon"; coordinates: number[][][] };
  properties: GridFeatureProperties;
}

export interface GridFeatureCollection {
  type: "FeatureCollection";
  features: GridFeature[];
}

/** 실시간 집계 — targetCount·visitedCount 둘 다 **건물** 수다 */
export interface GridSummary {
  gridId: string;
  targetCount: number;
  visitedCount: number;
}

/* ------------------------------------------------------------------ */
/* 관제·인증                                                           */
/* ------------------------------------------------------------------ */

export interface DashboardSummary {
  /** 세대 기준 */
  targetCount: number;
  /** 세대 기준 */
  doneCount: number;
  /** 건물 기준 — 위험 등급이 건물 속성이라 축이 다르다 */
  dangerCount: number;
  updatedAt: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}
