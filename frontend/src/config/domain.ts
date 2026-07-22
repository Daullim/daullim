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
