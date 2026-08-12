/**
 * API 응답 타입 — 계약 정본은 `docs/openapi.yaml`이고 이 파일은 그 손 사본이다.
 * 코드 생성기(openapi-typescript)를 붙이지 않은 이유는 의존성 0을 지키기 위해서다(ADR-005는 도구를
 * 권하지만 3주 MVP에서 10종 타입은 손으로 따라 쓰는 편이 싸다). **계약이 바뀌면 여기도 같이 고친다.**
 */
import type {
  BatteryType,
  ConditionCode,
  ConsentStatus,
  DetectorFlag,
  HouseType,
  Installed,
  RefusalReason,
  ReplaceReason,
  RespondentType,
  RevisitPlan,
  RiskLevel,
  RxCode,
  RxDone,
  UnitStatus,
} from "@/config/domain";

/** 커서 페이지네이션 — 마지막 페이지면 nextCursor가 null */
export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

/* ------------------------------------------------------------------ */
/* 계정                                                                */
/* ------------------------------------------------------------------ */

/** 로그인한 사용자 — 상단바·드로어·설정이 공용으로 쓴다. 소속 3종은 미입력이면 null이다. */
export interface CurrentUser {
  id: number;
  loginId: string;
  name: string;
  phone: string;
  birthOn: string;
  rankName: string | null;
  titleName: string | null;
  orgName: string | null;
  roleCode: string;
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

/**
 * 건물 축(`buildingCount`·`dangerCount`)과 세대 축(`householdCount`·`doneUnitCount`·
 * `pendingUnitCount`)이 한 객체에 섞여 있다 — 서로 곱하거나 나누면 세대 많은 건물이 가중된다.
 */
export interface Dong {
  dongCd: string;
  dongNm: string;
  /** 세대 수 (`count(units)`) — 평균 위험도와 축이 다르다 */
  householdCount: number;
  /** 건물 평균 점수 (소수 1자리) */
  avgRiskScore: number;
  avgRiskLevelCd: RiskLevel | null;
  buildingCount: number;
  /** 건물 축 — 화면 라벨을 "위험 주택"으로 쓴다 */
  dangerCount: number;
  /**
   * 상대위험도(`rr_i`) 평균 — "관할 기준 대비 몇 배". 점수(0~100)와 다른 축이라
   * 관제 ① 표의 기본 정렬 키다. 건물이 없는 동은 null이고 **0으로 대체하지 않는다**
   * (0이면 가장 안전한 동으로 정렬돼 올라온다).
   */
  avgRrI: number | null;
  doneUnitCount: number;
  /** 미완료 세대 — 진행률 잔량이자 관제 ④ 소요 수량 */
  pendingUnitCount: number;
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
/* 점검 저장                                                           */
/* ------------------------------------------------------------------ */

export interface ReplacementSubmitItem {
  replaceReasonCd: string | null;
  batteryTypeCd: string | null;
  detectorFlagCds: string[];
}

export interface VisitSubmitRequest {
  consentCd: string | null;
  respondentTypeCd?: string | null;
  refusalReasonCd?: string | null;
  refusalNote?: string | null;
  roomCount?: number | null;
  mfgYm?: string | null;
  mfgUnmarked?: boolean | null;
  replaceCount?: number | null;
  replacements?: ReplacementSubmitItem[];
  extinguisherInstalledCd?: string | null;
  rxDoneCd?: string | null;
  revisitPlanCd: string | null;
  noRevisitNote?: string | null;
  note?: string | null;
  routeOrder?: number | null;
  dispatchedScore?: number | null;
  dispatchedOrderKey?: number | null;
  scoreVersion?: string | null;
  gpsLat?: number | null;
  gpsLng?: number | null;
}

export interface VisitSaveResult {
  visitId: number;
  visitedDay: string;
  replay: boolean;
}

/* 점검 기록 조회 (G-2 · H-1) */

/** 목록 1행 — 표가 조인을 더 하지 않도록 주소·호수·점검원 이름이 함께 온다 */
export interface VisitListItem {
  visitId: number;
  unitId: number;
  buildingId: number;
  visitedDay: string;
  /** ISO 8601 — 표의 시각 열과 같은 날 정렬의 기준 */
  visitedAt: string;
  address: string;
  hoNm: string | null;
  flrNo: number | null;
  consentCd: ConsentStatus;
  inspected: boolean;
  conditionCode: ConditionCode | null;
  rxDoneCd: RxDone | null;
  officerName: string;
}

/** 달력 마킹용 — 건수가 0인 날은 오지 않는다 */
export interface VisitDayCount {
  day: string;
  count: number;
}

/**
 * 기간 집계 — '오늘' 카드가 `from=to=오늘`로 부른다.
 *
 * 목록으로는 만들 수 없다(커서로 잘려 와 첫 페이지만 세면 적게 나온다).
 * `byConsent`는 **건수가 0인 코드를 담지 않는다** — 화면이 `CONSENT_STATUS` 4종을 돌며 0으로 채운다.
 */
export interface VisitSummary {
  total: number;
  byConsent: Partial<Record<ConsentStatus, number>>;
  /** 실효 교체 대수 합 — 서버 판정 결과다(원입력 아님) */
  effectiveReplaceCount: number;
}

export interface ReplacementItemDetail {
  itemSeq: number;
  replaceReasonCd: ReplaceReason;
  batteryTypeCd: BatteryType | null;
  rxCodeCd: RxCode | null;
  conditionCode: ConditionCode | null;
  /** 전량 교체 확정(경과·미표기)으로 서버가 만든 행 */
  autoGenerated: boolean;
  detectorFlagCds: DetectorFlag[];
}

/** 상세 — 저장 요청의 원입력 + 서버만 아는 파생값 */
export interface VisitDetail {
  visitId: number;
  unitId: number;
  buildingId: number;
  address: string;
  hoNm: string | null;
  flrNo: number | null;
  visitedDay: string;
  visitedAt: string;
  officerName: string;
  consentCd: ConsentStatus;
  inspected: boolean;
  respondentTypeCd: RespondentType | null;
  refusalReasonCd: RefusalReason | null;
  refusalNote: string | null;
  roomCount: number | null;
  mfgYm: string | null;
  mfgUnmarked: boolean;
  replaceCount: number | null;
  expired: boolean | null;
  effectiveReplaceCount: number | null;
  conditionCode: ConditionCode | null;
  extinguisherInstalledCd: Installed | null;
  rxDoneCd: RxDone | null;
  revisitPlanCd: RevisitPlan;
  noRevisitNote: string | null;
  note: string | null;
  /** 그때의 판정 규칙 — 규칙이 바뀌어도 과거 판정을 재해석하지 않는다 */
  ruleVersion: string;
  replacements: ReplacementItemDetail[];
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

/** 행정동 경계 정적 GeoJSON — B1 지도에서 시군구 필터와 동 선택 강조에 쓴다 */
export interface AdminDongBoundaryProperties {
  /** 행정표준 행정동코드 10자리 */
  dong_cd: string;
  dong_nm: string;
  sigungu_cd: string;
  /** 경계 원본 버전. 화면 로직에는 쓰지 않는다 */
  source: string;
}

export type AdminDongBoundaryGeometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

export interface AdminDongBoundaryFeature {
  type: "Feature";
  geometry: AdminDongBoundaryGeometry;
  properties: AdminDongBoundaryProperties;
}

export interface AdminDongBoundaryFeatureCollection {
  type: "FeatureCollection";
  features: AdminDongBoundaryFeature[];
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
  /**
   * 미완료 세대의 처방 코드별 수 — 0건 코드도 담겨 온다.
   * 처방 없는 건물의 세대는 어느 칸에도 없어 합이 `targetCount - doneCount`보다 작을 수 있다.
   */
  pendingByRxCode: Record<RxCode, number>;
  /** 점수 산출 시각 (pipeline 월 1회) — 응답 시각인 `updatedAt`과 다른 축 */
  computedAt: string | null;
  updatedAt: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  /** 초 단위. 서버가 1시간으로 강제한다 */
  expiresIn: number;
}

export interface SignupResponse {
  id: number;
  loginId: string;
  name: string;
  createdAt: string;
}
