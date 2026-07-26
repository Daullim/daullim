/**
 * 일반주택 현장점검 폼(Step 0~4) — 상태 모델·리듀서·자동 판정.
 * 전부 순수 함수. 열거값은 config/domain.ts에서만 주입한다.
 * 판정 규칙 정본: 일반주택-현장점검-폼설계.md Step 3 (우선순위 위에서부터 첫 매칭).
 */
import {
  AGE_BAND,
  ALARM_CHECK,
  BATTERY_TYPE,
  DETECTOR_FLAG,
  EXT_FLAG,
  PRESSURE_STATUS,
  SERVICE_LIFE_YEARS,
  type AgeBand,
  type AlarmCheck,
  type BatteryType,
  type ConditionCode,
  type ConsentStatus,
  type DetectorFlag,
  type ExtFlag,
  type ExtLocation,
  type Installed,
  type PressureStatus,
  type RefusalReason,
  type RespondentType,
  type RevisitPlan,
  type RoomLabel,
  type RxCode,
  type RxDone,
  type SelfReportPeriod,
  type TriAnswer,
} from "@/config/domain";
import type { HouseholdItem } from "@/mock/sample";

export interface DetectorRow {
  roomLabel: RoomLabel;
  installed: Installed | null;
  /** 제조년월 라벨 실측 ("YYYY-MM") — 있으면 연차는 실측 */
  mfgYm: string | null;
  /** 라벨 판독 불가 폴백 — 추정 */
  ageBand: AgeBand | null;
  actuation: AlarmCheck | null;
  /** 방전 시에만 입력 */
  batteryType: BatteryType | null;
  /** "이상 있음" 토글 — 켠 행에만 외관 체크 펼침 */
  hasIssue: boolean;
  flags: DetectorFlag[];
}

export interface ExtinguisherRow {
  location: ExtLocation;
  installed: Installed | null;
  ageBand: AgeBand | null;
  pressure: PressureStatus | null;
  hasIssue: boolean;
  flags: ExtFlag[];
}

export interface InspectionFormState {
  // Step 0 — 방문 게이트
  consent: ConsentStatus | null;
  respondent: RespondentType | null;
  refusalReason: RefusalReason | null;
  selfReport: { period: SelfReportPeriod | null; tested: TriAnswer | null };
  refusalNote: string;
  // Step 1 — 대상물 분류
  roomCount: number | null;
  unitLabel: string;
  /** "실물과 다름" 정정 토글 — mock 단계는 표시만 (정정 입력은 프리필 연동 후) */
  prefillCorrected: boolean;
  // Step 2 — 체크리스트
  detectors: DetectorRow[];
  extinguishers: ExtinguisherRow[];
  // Step 4 — 사후관리
  rxDone: RxDone | null;
  revisit: RevisitPlan | null;
  note: string;
}

const ROOM_ORDER: RoomLabel[] = ["master", "living", "kitchen", "etc"];

function defaultDetectorRow(index: number, mfgYm: string | null = null): DetectorRow {
  return {
    roomLabel: ROOM_ORDER[Math.min(index, ROOM_ORDER.length - 1)],
    installed: "installed", // 최빈 결과 프리셋 (예외 기반 입력)
    mfgYm,
    ageBand: null,
    actuation: null,
    batteryType: null,
    hasIssue: false,
    flags: [],
  };
}

function defaultExtinguisherRow(): ExtinguisherRow {
  return {
    location: "entrance",
    installed: "installed",
    ageBand: null,
    pressure: null,
    hasIssue: false,
    flags: [],
  };
}

export function createInitialState(item: HouseholdItem): InspectionFormState {
  return {
    consent: null,
    respondent: null,
    refusalReason: null,
    selfReport: { period: null, tested: null },
    refusalNote: "",
    roomCount: null,
    // 단독주택(1가구)은 "본가구" 자동, 다가구·다세대는 현장 보완
    unitLabel: item.unitCount <= 1 ? "본가구" : "",
    prefillCorrected: false,
    detectors: [],
    extinguishers: [defaultExtinguisherRow()],
    rxDone: null,
    revisit: null,
    note: "",
  };
}

export type InspectionAction =
  | { type: "SET_CONSENT"; value: ConsentStatus }
  | { type: "SET_RESPONDENT"; value: RespondentType }
  | { type: "SET_REFUSAL_REASON"; value: RefusalReason }
  | { type: "SET_SELF_REPORT"; patch: Partial<InspectionFormState["selfReport"]> }
  | { type: "SET_REFUSAL_NOTE"; value: string }
  | { type: "SET_ROOM_COUNT"; value: number | null }
  | { type: "SET_UNIT_LABEL"; value: string }
  | { type: "TOGGLE_PREFILL_CORRECTED" }
  | { type: "SET_DETECTOR"; index: number; patch: Partial<DetectorRow> }
  | { type: "ALL_ROOMS_NORMAL" }
  | { type: "ADD_EXTINGUISHER" }
  | { type: "SET_EXTINGUISHER"; index: number; patch: Partial<ExtinguisherRow> }
  | { type: "SET_RX_DONE"; value: RxDone }
  | { type: "SET_REVISIT"; value: RevisitPlan }
  | { type: "SET_NOTE"; value: string };

export function inspectionReducer(
  state: InspectionFormState,
  action: InspectionAction,
): InspectionFormState {
  switch (action.type) {
    case "SET_CONSENT": {
      const next: InspectionFormState = { ...state, consent: action.value };
      if (action.value !== "refused") {
        // 거부 하위 필드 초기화 (거부→다른 상태 전환 시 잔존값 방지)
        next.refusalReason = null;
        next.selfReport = { period: null, tested: null };
        next.refusalNote = "";
      }
      return next;
    }
    case "SET_RESPONDENT":
      return { ...state, respondent: action.value };
    case "SET_REFUSAL_REASON": {
      const next: InspectionFormState = { ...state, refusalReason: action.value };
      if (action.value !== "self-replaced") {
        next.selfReport = { period: null, tested: null };
      } else if (state.revisit === null) {
        // 자체교체 신고 = 재방문 불필요 기본값 (큐 제외, 권장연수 재도래 시 배치 재산입)
        next.revisit = "not-needed";
      }
      return next;
    }
    case "SET_SELF_REPORT":
      return { ...state, selfReport: { ...state.selfReport, ...action.patch } };
    case "SET_REFUSAL_NOTE":
      return { ...state, refusalNote: action.value };
    case "SET_ROOM_COUNT": {
      const n = action.value;
      if (n === null || n < 1) return { ...state, roomCount: n, detectors: [] };
      const firstMfg = state.detectors[0]?.mfgYm ?? null;
      const detectors = Array.from(
        { length: n },
        (_, i) => state.detectors[i] ?? defaultDetectorRow(i, firstMfg),
      );
      return { ...state, roomCount: n, detectors };
    }
    case "SET_UNIT_LABEL":
      return { ...state, unitLabel: action.value };
    case "TOGGLE_PREFILL_CORRECTED":
      return { ...state, prefillCorrected: !state.prefillCorrected };
    case "SET_DETECTOR": {
      const prevFirstMfg = state.detectors[0]?.mfgYm ?? null;
      let detectors = state.detectors.map((row, i) =>
        i === action.index ? { ...row, ...action.patch } : row,
      );
      // 첫 행 제조년월 입력 시 나머지 행 자동 복사 (동일 시기 일괄 설치 가정 — 개별 수정 행은 보존)
      if (action.index === 0 && action.patch.mfgYm !== undefined) {
        const mfgYm = action.patch.mfgYm;
        detectors = detectors.map((row, i) =>
          i > 0 && (row.mfgYm === null || row.mfgYm === prevFirstMfg)
            ? { ...row, mfgYm }
            : row,
        );
      }
      return { ...state, detectors };
    }
    case "ALL_ROOMS_NORMAL":
      // "모든 실 정상" 원탭 — 설치됨·정상·외관 이상무 일괄
      return {
        ...state,
        detectors: state.detectors.map((row) => ({
          ...row,
          installed: "installed",
          actuation: "normal",
          batteryType: null,
          hasIssue: false,
          flags: [],
        })),
      };
    case "ADD_EXTINGUISHER":
      return { ...state, extinguishers: [...state.extinguishers, defaultExtinguisherRow()] };
    case "SET_EXTINGUISHER":
      return {
        ...state,
        extinguishers: state.extinguishers.map((row, i) =>
          i === action.index ? { ...row, ...action.patch } : row,
        ),
      };
    case "SET_RX_DONE":
      return { ...state, rxDone: action.value };
    case "SET_REVISIT":
      return { ...state, revisit: action.value };
    case "SET_NOTE":
      return { ...state, note: action.value };
  }
}

/* ---------------------------- 파생·판정 ---------------------------- */

/** "YYYY-MM" → 경과 연수 (소수 버림) */
export function yearsSince(mfgYm: string, now: Date = new Date()): number {
  const [y, m] = mfgYm.split("-").map(Number);
  const months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
  return Math.floor(months / 12);
}

/**
 * 건축물대장 표제부 사용승인일(YYYYMMDD) → 건축연월·준공연차.
 * 대장 미등재(빈값)·형식 불량이면 null (Step 1에서 결측 UI로 분기).
 */
export function parseUseApr(
  useAprDay: string | null | undefined,
  now: Date = new Date(),
): { ymLabel: string; years: number } | null {
  const s = (useAprDay ?? "").trim();
  if (!/^\d{8}$/.test(s)) return null;
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(4, 6));
  if (m < 1 || m > 12) return null;
  return { ymLabel: `${y}.${s.slice(4, 6)}`, years: yearsSince(`${y}-${m}`, now) };
}

/** 연차 산정: mfgYm(실측) 우선 > ageBand.minYears(추정) 폴백 */
function elapsedYears(mfgYm: string | null, ageBand: AgeBand | null): number | null {
  if (mfgYm) return yearsSince(mfgYm);
  if (ageBand) return AGE_BAND[ageBand].minYears;
  return null;
}

/** 연차가 추정 폴백 기반인지 — EXPIRED 판정에 "(추정)" 동반 표기용 */
export function isAgeEstimated(row: { mfgYm?: string | null; ageBand: AgeBand | null }): boolean {
  return !row.mfgYm && row.ageBand !== null;
}

/** 감지기 자동 판정 — 미설치·미입력은 판정 없음(null), 처방은 deriveRx가 담당 */
export function judgeDetector(row: DetectorRow): ConditionCode | null {
  if (row.installed !== "installed" || !row.actuation) return null;
  const severe = row.flags.some((f) => DETECTOR_FLAG[f].severe);
  if (row.actuation !== "normal" || severe) return "DEFECTIVE";
  const years = elapsedYears(row.mfgYm, row.ageBand);
  if (years !== null && years >= SERVICE_LIFE_YEARS.detector) return "EXPIRED";
  if (row.flags.length > 0) return "REPLACE_ADVISED";
  return "OK_GOOD";
}

/** 소화기 자동 판정 — 압력 이상(가압식 의심 포함)·중대 외관 결함은 무조건 불량 */
export function judgeExtinguisher(row: ExtinguisherRow): ConditionCode | null {
  if (row.installed !== "installed" || !row.pressure) return null;
  const severe = row.flags.some((f) => EXT_FLAG[f].severe);
  if (PRESSURE_STATUS[row.pressure].severe || severe) return "DEFECTIVE";
  const years = row.ageBand ? AGE_BAND[row.ageBand].minYears : null;
  if (years !== null && years >= SERVICE_LIFE_YEARS.extinguisher) return "EXPIRED";
  if (row.flags.length > 0) return "REPLACE_ADVISED";
  return "OK_GOOD";
}

/**
 * 처방 코드 파생 — battery_type이 ALARM_CHECK crossref를 오버라이드.
 * 일체형 방전은 전지 교체 불가 → RX-IOT (오처방 방지), 모름은 RX-BAT 폴백.
 */
export function deriveRx(row: DetectorRow): RxCode | null {
  if (row.installed === "missing") return "RX-IOT"; // 미설치 → 설치 권고
  if (row.actuation === "detached") return "RX-IOT";
  if (row.actuation === "battery-dead") {
    return (row.batteryType && BATTERY_TYPE[row.batteryType].rx) ?? ALARM_CHECK["battery-dead"].rx;
  }
  return null;
}

/** 저장 가능 조건 — 비승낙은 게이트 값만으로 저장 가능 (헛걸음 기록 비용 최소화) */
export function canSave(state: InspectionFormState): boolean {
  switch (state.consent) {
    case null:
      return false;
    case "refused":
      return state.refusalReason !== null;
    case "vacant":
    case "unreachable":
      return true;
    case "accepted": {
      if (!state.respondent) return false;
      if (!state.roomCount || state.roomCount < 1) return false;
      const detectorsOk = state.detectors.every((row) => {
        if (row.installed === null) return false;
        if (row.installed === "missing") return true;
        if (!row.actuation) return false;
        if (row.actuation === "battery-dead" && !row.batteryType) return false;
        return true;
      });
      const extOk = state.extinguishers.every((row) => {
        if (row.installed === null) return false;
        if (row.installed === "missing") return true;
        return row.pressure !== null;
      });
      return detectorsOk && extOk;
    }
  }
}
