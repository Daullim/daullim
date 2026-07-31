/**
 * 일반주택 현장점검 폼(Step 0~3) — 상태 모델·리듀서·자동 판정.
 * 전부 순수 함수. 열거값은 config/domain.ts에서만 주입한다.
 * 판정 규칙 정본: 일반주택-현장점검-폼설계.md Step 3 (우선순위 위에서부터 첫 매칭).
 */
import {
  ALARM_CHECK,
  BATTERY_TYPE,
  DETECTOR_FLAG,
  REPLACE_REASON,
  SERVICE_LIFE_YEARS,
  type BatteryType,
  type ConditionCode,
  type ConsentStatus,
  type DetectorFlag,
  type Installed,
  type RefusalReason,
  type ReplaceReason,
  type RespondentType,
  type RevisitPlan,
  type RxCode,
  type RxDone,
} from "@/config/domain";
import type { HouseholdItem } from "@/mock/sample";

/** 교체 대상 1건 — 사유와 그 후속 입력을 함께 담는다 */
export interface ReplacementItem {
  reason: ReplaceReason | null;
  /** reason=battery-dead일 때만 */
  batteryType: BatteryType | null;
  /** reason=appearance일 때만 — severe 판정 분기의 입력원 */
  flags: DetectorFlag[];
}

function emptyReplacement(): ReplacementItem {
  return { reason: null, batteryType: null, flags: [] };
}

export interface InspectionFormState {
  // Step 0 — 방문 게이트
  consent: ConsentStatus | null;
  respondent: RespondentType | null;
  refusalReason: RefusalReason | null;
  refusalNote: string;
  // Step 1 — 경보기 (실별 반복이 아니라 세대 단위 집계)
  /** 구획된 실 개수 = 법상 설치 의무 수량 = 교체 개수의 분모 */
  roomCount: number | null;
  /** 방문 세대 식별 — B3 세대 목록에서 고른 호수가 그대로 들어온다(입력란 없음) */
  unitLabel: string;
  /** 제조년월 라벨 실측 ("YYYY-MM") — 일괄 설치 가정으로 세대 공통 1회 */
  mfgYm: string | null;
  /** 라벨 마모·도색으로 제조년월을 읽을 수 없음 — 연식을 보증할 수 없으니 전량 교체 대상 */
  mfgUnmarked: boolean;
  /** 교체 필요 개수 (0 = 전부 정상). 내용연수 경과 시엔 roomCount로 자동 확정 */
  replaceCount: number | null;
  /** 교체 대상별 사유 — 길이 = replaceCount (내용연수 경과 시엔 비어 있다) */
  replacements: ReplacementItem[];
  // Step 2 — 소화기 (개수 세지 않음)
  extinguisherInstalled: Installed | null;
  // Step 3 — 사후관리
  rxDone: RxDone | null;
  revisit: RevisitPlan | null;
  note: string;
}

export function createInitialState(
  item: HouseholdItem,
  /** 세대 목록에서 고른 호수 — 미전달 시 기존 규칙(단독은 "본가구", 그 외 공란) */
  unitLabel?: string,
): InspectionFormState {
  return {
    consent: null,
    respondent: null,
    refusalReason: null,
    refusalNote: "",
    roomCount: null,
    // 세대 목록에서 온 호수 우선. 단독주택(1가구)은 "본가구" 자동
    unitLabel: unitLabel ?? (item.unitCount <= 1 ? "본가구" : ""),
    mfgYm: null,
    mfgUnmarked: false,
    replaceCount: null,
    replacements: [],
    extinguisherInstalled: null,
    rxDone: null,
    revisit: null,
    note: "",
  };
}

export type InspectionAction =
  | { type: "SET_CONSENT"; value: ConsentStatus }
  | { type: "SET_RESPONDENT"; value: RespondentType }
  | { type: "SET_REFUSAL_REASON"; value: RefusalReason }
  | { type: "SET_REFUSAL_NOTE"; value: string }
  | { type: "SET_ROOM_COUNT"; value: number | null }
  | { type: "SET_MFG_YM"; value: string | null }
  | { type: "SET_MFG_UNMARKED"; value: boolean }
  | { type: "SET_REPLACE_COUNT"; value: number | null }
  | { type: "SET_REPLACEMENT_REASON"; index: number; value: ReplaceReason }
  | { type: "SET_REPLACEMENT_BATTERY"; index: number; value: BatteryType }
  | { type: "TOGGLE_REPLACEMENT_FLAG"; index: number; value: DetectorFlag }
  | { type: "SET_EXTINGUISHER_INSTALLED"; value: Installed }
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
        next.refusalNote = "";
      }
      return next;
    }
    case "SET_RESPONDENT":
      return { ...state, respondent: action.value };
    case "SET_REFUSAL_REASON":
      return { ...state, refusalReason: action.value };
    case "SET_REFUSAL_NOTE":
      return { ...state, refusalNote: action.value };
    case "SET_ROOM_COUNT": {
      const n = action.value;
      // 실 개수가 줄면 교체 개수가 분모를 넘을 수 있다 → 클램프
      const replaceCount =
        n !== null && state.replaceCount !== null ? Math.min(state.replaceCount, n) : state.replaceCount;
      return { ...state, roomCount: n, replaceCount };
    }
    case "SET_MFG_YM":
      // 실측이 들어오면 미표기는 성립하지 않는다 (둘이 공존하면 판정 근거가 모호해진다)
      return { ...state, mfgYm: action.value, mfgUnmarked: action.value ? false : state.mfgUnmarked };
    case "SET_MFG_UNMARKED":
      return { ...state, mfgUnmarked: action.value, mfgYm: action.value ? null : state.mfgYm };
    case "SET_REPLACE_COUNT": {
      const n = action.value;
      // 개수만큼 사유 칸을 만든다 — 기존 항목은 인덱스로 보존, 초과분은 잘라낸다
      if (n === null || n < 1) return { ...state, replaceCount: n, replacements: [] };
      const replacements = Array.from(
        { length: n },
        (_, i) => state.replacements[i] ?? emptyReplacement(),
      );
      return { ...state, replaceCount: n, replacements };
    }
    case "SET_REPLACEMENT_REASON":
      // 사유 전환 시 그 항목의 하위 필드만 초기화 (SET_CONSENT 패턴을 항목 단위로)
      return {
        ...state,
        replacements: state.replacements.map((item, i) =>
          i !== action.index
            ? item
            : {
                reason: action.value,
                batteryType: action.value === "battery-dead" ? item.batteryType : null,
                flags: action.value === "appearance" ? item.flags : [],
              },
        ),
      };
    case "SET_REPLACEMENT_BATTERY":
      return {
        ...state,
        replacements: state.replacements.map((item, i) =>
          i === action.index ? { ...item, batteryType: action.value } : item,
        ),
      };
    case "TOGGLE_REPLACEMENT_FLAG":
      return {
        ...state,
        replacements: state.replacements.map((item, i) =>
          i !== action.index
            ? item
            : {
                ...item,
                flags: item.flags.includes(action.value)
                  ? item.flags.filter((f) => f !== action.value)
                  : [...item.flags, action.value],
              },
        ),
      };
    case "SET_EXTINGUISHER_INSTALLED":
      return { ...state, extinguisherInstalled: action.value };
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
 * 대장 미등재(빈값)·형식 불량이면 null (B3 세대 패널에서 '미등재'로 분기).
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

/** YYYYMMDD → "YYYY.MM.DD". 결측·형식 불량이면 null (호출부에서 결측 문구로 분기) */
export function formatDay(day: string | null | undefined): string | null {
  const s = (day ?? "").trim();
  if (!/^\d{8}$/.test(s)) return null;
  const m = Number(s.slice(4, 6));
  const d = Number(s.slice(6, 8));
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6, 8)}`;
}

/** 내용연수 경과 여부 — 경과면 작동여부와 무관하게 전량 교체 대상 */
export function isExpired(state: InspectionFormState): boolean {
  if (!state.mfgYm) return false;
  return yearsSince(state.mfgYm) >= SERVICE_LIFE_YEARS.detector;
}

/**
 * 개수·사유 입력 없이 전량 교체가 확정되는 경우의 사유. 아니면 null.
 *
 * 경과는 연식이 다한 것이고, 미표기는 연식을 보증할 수 없는 것이다. 둘 다 개별 판단의
 * 여지가 없어 실 개수만큼 자동 기록한다. 제조년월이 없으면 경과 판정 자체가 불가능하므로
 * 두 경우는 배타적이다.
 */
export function autoReplaceReason(state: InspectionFormState): ReplaceReason | null {
  if (isExpired(state)) return "expired";
  if (state.mfgUnmarked) return "unmarked";
  return null;
}

/** 전량 교체가 확정된 경우 개수 입력을 받지 않고 분모를 그대로 쓴다 */
export function effectiveReplaceCount(state: InspectionFormState): number | null {
  if (autoReplaceReason(state)) return state.roomCount;
  return state.replaceCount;
}

/** 항목 1건 판정 — 실별 판정의 우선순위를 그대로 옮겼다 */
function judgeItem(item: ReplacementItem): ConditionCode | null {
  if (!item.reason) return null;
  if (item.reason === "expired") return "EXPIRED";
  // 미표기는 연차를 논할 자격이 없는 건이라 EXPIRED가 아니라 DEFECTIVE로 간다
  if (item.reason === "battery-dead" || item.reason === "detached" || item.reason === "unmarked") {
    return "DEFECTIVE";
  }
  if (item.reason === "appearance") {
    return item.flags.some((f) => DETECTOR_FLAG[f].severe) ? "DEFECTIVE" : "REPLACE_ADVISED";
  }
  return "REPLACE_ADVISED"; // etc
}

/** 심각도 서열 — 세대 종합 판정은 항목 최악값 */
const CODE_RANK: Record<ConditionCode, number> = {
  OK_GOOD: 0,
  REPLACE_ADVISED: 1,
  EXPIRED: 2,
  DEFECTIVE: 3,
};

/** 경보기 자동 판정 (세대 종합) — 미입력은 판정 없음(null) */
export function judgeAlarms(state: InspectionFormState): ConditionCode | null {
  const count = effectiveReplaceCount(state);
  if (count === null) return null;
  if (count === 0) return "OK_GOOD";
  const auto = autoReplaceReason(state);
  if (auto) return judgeItem({ reason: auto, batteryType: null, flags: [] }); // 전량 교체 자동 확정
  const codes = state.replacements.map(judgeItem);
  if (codes.length === 0 || codes.some((c) => c === null)) return null;
  return (codes as ConditionCode[]).reduce((worst, c) =>
    CODE_RANK[c] > CODE_RANK[worst] ? c : worst,
  );
}

/** 항목 1건 처방 — 방전만 BATTERY_TYPE이 REPLACE_REASON을 오버라이드 */
function rxOf(item: ReplacementItem): RxCode | null {
  if (!item.reason) return null;
  if (item.reason === "battery-dead") {
    // 일체형 방전은 전지 교체 불가 → RX-IOT (오처방 방지), 모름은 RX-BAT 폴백
    return (item.batteryType && BATTERY_TYPE[item.batteryType].rx) ?? ALARM_CHECK["battery-dead"].rx;
  }
  return REPLACE_REASON[item.reason].rx;
}

/** 처방 목록 — 같은 코드끼리 묶어 건수와 함께 */
export function deriveRxList(state: InspectionFormState): { rx: RxCode; count: number }[] {
  const counts = new Map<RxCode, number>();
  const auto = autoReplaceReason(state);
  if (auto) {
    const rx = REPLACE_REASON[auto].rx;
    if (rx) counts.set(rx, effectiveReplaceCount(state) ?? 0);
  } else {
    for (const item of state.replacements) {
      const rx = rxOf(item);
      if (rx) counts.set(rx, (counts.get(rx) ?? 0) + 1);
    }
  }
  return [...counts].map(([rx, count]) => ({ rx, count })).filter((x) => x.count > 0);
}

/** 사유별 건수 요약 — 최종 확인 화면용 */
export function reasonSummary(state: InspectionFormState): { reason: ReplaceReason; count: number }[] {
  const counts = new Map<ReplaceReason, number>();
  const auto = autoReplaceReason(state);
  if (auto) {
    counts.set(auto, effectiveReplaceCount(state) ?? 0);
  } else {
    for (const item of state.replacements) {
      if (item.reason) counts.set(item.reason, (counts.get(item.reason) ?? 0) + 1);
    }
  }
  return [...counts].map(([reason, count]) => ({ reason, count })).filter((x) => x.count > 0);
}

/* ---------------------------- 단계(위저드) ---------------------------- */

export type StepId = "gate" | "alarm" | "extinguisher" | "post" | "review";

export const STEP_LABEL: Record<StepId, string> = {
  gate: "방문 승낙 확인",
  alarm: "경보기 확인",
  extinguisher: "소화기 확인",
  post: "사후관리",
  review: "최종 확인",
};

/** 비승낙은 경보기·소화기를 물리적으로 수행할 수 없다 → 3단계로 축약 */
export function stepsFor(state: InspectionFormState): StepId[] {
  return state.consent === "accepted"
    ? ["gate", "alarm", "extinguisher", "post", "review"]
    : ["gate", "post", "review"];
}

/** 해당 단계의 필수값이 채워졌는지 — 다음 버튼 활성 조건 */
export function canAdvance(state: InspectionFormState, step: StepId): boolean {
  switch (step) {
    case "gate":
      if (state.consent === null) return false;
      if (state.consent === "refused") return state.refusalReason !== null;
      if (state.consent === "accepted") return state.respondent !== null;
      return true;
    case "alarm": {
      if (!state.roomCount || state.roomCount < 1) return false;
      if (!state.mfgYm && !state.mfgUnmarked) return false;
      if (autoReplaceReason(state)) return true; // 전량 교체 자동 확정 — 추가 입력 없음
      if (state.replaceCount === null) return false;
      if (state.replaceCount === 0) return true;
      // 항목마다 사유가 있어야 하고, 방전엔 전지 유형·외관이상엔 세부 항목이 필요하다
      return state.replacements.every((item) => {
        if (!item.reason) return false;
        if (item.reason === "battery-dead" && !item.batteryType) return false;
        if (item.reason === "appearance" && item.flags.length === 0) return false;
        return true;
      });
    }
    case "extinguisher":
      return state.extinguisherInstalled !== null;
    case "post":
      return true; // 사후관리는 전 항목 선택 입력
    case "review":
      return canSubmit(state);
  }
}

/** 최종 확인용 누락 목록 — 비어 있으면 제출 가능 */
export function missingItems(state: InspectionFormState): string[] {
  return stepsFor(state)
    .filter((s) => s !== "review" && !canAdvance(state, s))
    .map((s) => STEP_LABEL[s]);
}

/** 제출 가능 조건 — 비승낙은 게이트 값만으로 제출 가능 (헛걸음 기록 비용 최소화) */
export function canSubmit(state: InspectionFormState): boolean {
  return missingItems(state).length === 0;
}
