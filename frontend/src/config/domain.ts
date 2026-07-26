/**
 * 도메인 열거값 주입 지점 — 화면·컴포넌트에 상태명을 하드코딩하지 않는다.
 *
 * ⚠️ 방문/점검 상태 모델은 팀 미합의 (DESIGN.md Known Gaps).
 * 합의되면 이 파일의 VISIT_STATUS 하나만 수정한다.
 */

/** 색이 아니라 "톤 슬롯" — tokens.css의 status-* semantic 토큰과 1:1 */
export type StatusTone = "neutral" | "positive" | "negative" | "caution" | "info";

export type VisitStatus = "pending" | "done" | "refused" | "vacant" | "unreachable";

export const VISIT_STATUS: Record<VisitStatus, { label: string; tone: StatusTone }> = {
  pending: { label: "대기", tone: "neutral" },
  done: { label: "완료", tone: "positive" },
  refused: { label: "거부", tone: "negative" },
  vacant: { label: "공가", tone: "caution" },
  unreachable: { label: "두절", tone: "caution" },
};

export type RiskLevel = "danger" | "warn" | "ok";

export const RISK_LEVEL: Record<RiskLevel, { label: string }> = {
  danger: { label: "위험" },
  warn: { label: "경고" },
  ok: { label: "양호" },
};

export type RxCode = "RX-BAT" | "RX-IOT";

export const RX: Record<RxCode, { label: string }> = {
  "RX-BAT": { label: "전지 교체" },
  "RX-IOT": { label: "재부착" },
};

/** 작동여부 3-way — 점검 폼 */
export type AlarmCheck = "normal" | "battery-dead" | "detached";

export const ALARM_CHECK: Record<AlarmCheck, { label: string; rx: RxCode | null }> = {
  normal: { label: "정상", rx: null },
  "battery-dead": { label: "방전", rx: "RX-BAT" },
  detached: { label: "탈거", rx: "RX-IOT" },
};

/** 방문상태 (점검 폼 1단계) — 역시 미합의 모델의 부분집합, config에서만 관리 */
export type VisitOutcome = "met" | "absent" | "refused";

export const VISIT_OUTCOME: Record<VisitOutcome, { label: string }> = {
  met: { label: "방문·점검" },
  absent: { label: "부재" },
  refused: { label: "거부" },
};

/* ------------------------------------------------------------------ */
/* 일반주택 현장점검 폼 (Step 0~4) — 일반주택-현장점검-폼설계.md 확정 코드 */
/* ------------------------------------------------------------------ */

/** Step 0 — 방문 승낙 게이트 4-way (consent_status) */
export type ConsentStatus = "accepted" | "refused" | "vacant" | "unreachable";

export const CONSENT_STATUS: Record<ConsentStatus, { label: string; tone: StatusTone }> = {
  accepted: { label: "승낙", tone: "positive" },
  refused: { label: "거부", tone: "negative" },
  vacant: { label: "공가", tone: "caution" },
  unreachable: { label: "연락두절", tone: "caution" },
};

/** Step 0 — 거부 사유 (refusal_reason_cd) */
export type RefusalReason = "self-replaced" | "no-need" | "distrust" | "no-time" | "etc";

export const REFUSAL_REASON: Record<RefusalReason, { label: string }> = {
  "self-replaced": { label: "자체교체(최근 교체했음)" },
  "no-need": { label: "필요 없다" },
  distrust: { label: "외부인 불신" },
  "no-time": { label: "시간 없음" },
  etc: { label: "기타" },
};

/** Step 0 — 응대자 유형 (respondent_type). 설치 의무자는 소유자(소방시설법 제8조) */
export type RespondentType = "owner" | "tenant" | "family" | "etc";

export const RESPONDENT_TYPE: Record<RespondentType, { label: string }> = {
  owner: { label: "소유자" },
  tenant: { label: "세입자(임차인)" },
  family: { label: "가족·대리인" },
  etc: { label: "기타" },
};

/** Step 0 — 자가신고 미니폼: 교체 시기 구간 (estimation_flag=추정 고정) */
export type SelfReportPeriod = "within-6m" | "within-1y" | "over-1y" | "unknown";

export const SELF_REPORT_PERIOD: Record<SelfReportPeriod, { label: string }> = {
  "within-6m": { label: "6개월 이내" },
  "within-1y": { label: "1년 이내" },
  "over-1y": { label: "그 이상" },
  unknown: { label: "모름" },
};

/** 예/아니오/모름 3답 (자가신고 작동확인 등) */
export type TriAnswer = "yes" | "no" | "unknown";

export const TRI_ANSWER: Record<TriAnswer, { label: string }> = {
  yes: { label: "예" },
  no: { label: "아니오" },
  unknown: { label: "모름" },
};

/** Step 1 — 주택 유형 (house_type, 소방시설법 제8조 대상 5분류) + 소유구조 파생 */
export type HouseType = "detached" | "multi-user" | "multi-family" | "row-house" | "multi-unit";

export const HOUSE_TYPE: Record<HouseType, { label: string; ownership: "single" | "multiple" }> = {
  detached: { label: "단독주택", ownership: "single" },
  "multi-user": { label: "다중주택", ownership: "single" },
  "multi-family": { label: "다가구주택", ownership: "single" },
  "row-house": { label: "연립주택", ownership: "multiple" },
  "multi-unit": { label: "다세대주택", ownership: "multiple" },
};

export const OWNERSHIP_LABEL: Record<"single" | "multiple", string> = {
  single: "소유주 1인",
  multiple: "소유주 여러 명",
};

/** Step 2 — 설치 여부 (감지기·소화기 공용). 미설치 → 이하 필드 스킵, 설치 권고 분기 */
export type Installed = "installed" | "missing";

export const INSTALLED: Record<Installed, { label: string }> = {
  installed: { label: "설치됨" },
  missing: { label: "미설치" },
};

/** Step 2 — 감지기 설치 위치(실 이름) */
export type RoomLabel = "master" | "living" | "kitchen" | "etc";

export const ROOM_LABEL: Record<RoomLabel, { label: string }> = {
  master: { label: "안방" },
  living: { label: "거실" },
  kitchen: { label: "주방" },
  etc: { label: "기타실" },
};

/** Step 2 — 소화기 설치 위치 */
export type ExtLocation = "entrance" | "living" | "floor-hall" | "etc";

export const EXT_LOCATION: Record<ExtLocation, { label: string }> = {
  entrance: { label: "현관" },
  living: { label: "거실" },
  "floor-hall": { label: "층별 복도" },
  etc: { label: "기타" },
};

/** Step 2 — 연차 구간 (라벨 판독 불가 시 폴백, estimation_flag=추정) */
export type AgeBand = "le-5" | "y5-10" | "y10-15" | "gt-15" | "unknown";

export const AGE_BAND: Record<AgeBand, { label: string; minYears: number | null }> = {
  "le-5": { label: "5년 이하", minYears: 0 },
  "y5-10": { label: "5~10년", minYears: 5 },
  "y10-15": { label: "10~15년", minYears: 10 },
  "gt-15": { label: "15년 초과", minYears: 15 },
  unknown: { label: "모름", minYears: null },
};

/**
 * 권장 내용연수 — 감지기 15년은 배선형 연기감지기 기준 준용치,
 * 소화기 10년은 공식 고시 재확인 필요 (폼설계 §0 "확인 필요").
 */
export const SERVICE_LIFE_YEARS = { detector: 15, extinguisher: 10 } as const;

/** Step 2 — 전지 유형 (battery_type, 방전 시에만). 일체형은 전지 교체 불가 → RX-IOT */
export type BatteryType = "replaceable" | "sealed" | "unknown";

export const BATTERY_TYPE: Record<BatteryType, { label: string; rx: RxCode | null }> = {
  replaceable: { label: "교체형", rx: "RX-BAT" },
  sealed: { label: "일체형(10년 밀폐형)", rx: "RX-IOT" },
  unknown: { label: "모름", rx: null }, // 현장 커버 개방으로 판별 전 — ALARM_CHECK crossref 폴백
};

/** Step 2 — 소화기 지시압력계 (pressure_status). 압력계 없음=가압식 의심, 무조건 불량 */
export type PressureStatus = "normal" | "no-pressure" | "over-pressure" | "no-gauge";

export const PRESSURE_STATUS: Record<PressureStatus, { label: string; severe: boolean }> = {
  normal: { label: "정상(녹색범위)", severe: false },
  "no-pressure": { label: "압력 없음", severe: true },
  "over-pressure": { label: "압력 높음", severe: true },
  "no-gauge": { label: "압력계 없음(가압식 의심)", severe: true },
};

/** Step 2 — 감지기 외관 체크 (severe=중대결함 → 판정 1순위). ※ 배선형 자탐설비 기준 준용 */
export type DetectorFlag = "stain" | "cover-damage" | "false-alarm" | "condensation";

export const DETECTOR_FLAG: Record<DetectorFlag, { label: string; severe: boolean }> = {
  stain: { label: "도색·기름때 오염", severe: false },
  "cover-damage": { label: "커버 파손·틈새", severe: true },
  "false-alarm": { label: "비화재보(오작동) 이력", severe: false },
  condensation: { label: "결로·이물질 흔적", severe: false },
};

/** Step 2 — 소화기 외관 체크. severe 분류는 판정표 "파손·부식" 문언 기준 — 실무 검수 대상 */
export type ExtFlag = "corrosion" | "seal-pin" | "hose-nozzle";

export const EXT_FLAG: Record<ExtFlag, { label: string; severe: boolean }> = {
  corrosion: { label: "부식·손상·누액", severe: true },
  "seal-pin": { label: "봉인·안전핀 이상", severe: false },
  "hose-nozzle": { label: "호스·노즐 파손", severe: true },
};

/** Step 3 — 자동 판정 4단계 (condition_code). 키=확정 데이터 코드 (RX-BAT 선례) */
export type ConditionCode = "OK_GOOD" | "REPLACE_ADVISED" | "EXPIRED" | "DEFECTIVE";

export const CONDITION_CODE: Record<ConditionCode, { label: string; tone: StatusTone }> = {
  OK_GOOD: { label: "양호", tone: "positive" },
  REPLACE_ADVISED: { label: "교체권고", tone: "caution" },
  EXPIRED: { label: "내용연수경과", tone: "caution" },
  DEFECTIVE: { label: "불량", tone: "negative" },
};

/** Step 4 — 현장 교체 완료 여부 (rx_done) */
export type RxDone = "done" | "advised-only" | "owner-refused";

export const RX_DONE: Record<RxDone, { label: string }> = {
  done: { label: "완료" },
  "advised-only": { label: "미완료(권고만 전달)" },
  "owner-refused": { label: "소유자 거부" },
};

/**
 * Step 4 — 재방문 필요 여부 (visit_result). 2택만.
 * 사유는 consent_status·refusal_reason_cd에서 자동 상속(대원 재입력 없음),
 * 채널(우편안내·기관경유·직접재방문) 결정은 현장이 아니라 재방문 큐(행정 레이어)가
 * 사유 기반 자동 제안 — "기록(현장) vs 결정(back-office)" 역할 분리.
 */
export type RevisitPlan = "not-needed" | "revisit";

export const REVISIT_PLAN: Record<RevisitPlan, { label: string }> = {
  "not-needed": { label: "재방문 불필요" },
  revisit: { label: "재방문 필요" },
};
