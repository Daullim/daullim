import type { InspectionFormState } from "@/lib/inspection";

/**
 * 저장된 점검 기록.
 *
 * InspectionFormState에는 식별자·날짜·점검원이 없다(폼 입력값만 담는다). 조회 화면에 필요한
 * 메타를 감싸고 폼 상태는 그대로 들고 있어, 상세 화면이 ReviewSection에 바로 넘길 수 있게 한다.
 */
export interface InspectionRecord {
  id: string;
  /** YYYYMMDD — 캘린더 키. 앱 전체 날짜 규약과 동일 */
  day: string;
  /** HH:MM — 방문 시각. 같은 날 기록의 정렬 기준 */
  time: string;
  buildingRank: number;
  address: string;
  unitLabel: string;
  inspectorName: string;
  form: InspectionFormState;
}

/** 폼 기본값 — 미입력 필드를 일일이 null로 적지 않기 위한 베이스 */
const BLANK: InspectionFormState = {
  consent: null,
  respondent: null,
  refusalReason: null,
  refusalNote: "",
  roomCount: null,
  unitLabel: "",
  mfgYm: null,
  mfgUnmarked: false,
  replaceCount: null,
  replacements: [],
  extinguisherInstalled: null,
  rxDone: null,
  revisit: null,
  noRevisitNote: "",
  note: "",
};

function form(unitLabel: string, patch: Partial<InspectionFormState>): InspectionFormState {
  return { ...BLANK, unitLabel, ...patch };
}

/* 시연 기준월은 2026-07. 월 이동 확인용으로 2026-06에도 며칠 남겨 둔다. */
export const INSPECTION_RECORDS: InspectionRecord[] = [
  /* ── 2026-06 ────────────────────────────────────────────────────────── */
  {
    id: "R-20260622-1",
    day: "20260622",
    time: "10:20",
    buildingRank: 3,
    address: "관악구 성현로 8",
    unitLabel: "1층 101호",
    inspectorName: "이영선",
    form: form("1층 101호", {
      consent: "accepted",
      respondent: "owner",
      roomCount: 3,
      mfgYm: "2021-04",
      replaceCount: 0,
      extinguisherInstalled: "installed",
      rxDone: "advised-only",
      revisit: "not-needed",
    }),
  },
  {
    id: "R-20260622-2",
    day: "20260622",
    time: "10:45",
    buildingRank: 3,
    address: "관악구 성현로 8",
    unitLabel: "1층 102호",
    inspectorName: "이영선",
    form: form("1층 102호", {
      consent: "unreachable",
      revisit: "revisit",
      note: "주간 부재 추정 — 야간 재방문 필요",
    }),
  },
  {
    id: "R-20260629-1",
    day: "20260629",
    time: "14:10",
    buildingRank: 2,
    address: "관악구 은천로 41",
    unitLabel: "2층 좌",
    inspectorName: "이영선",
    form: form("2층 좌", {
      consent: "accepted",
      respondent: "tenant",
      roomCount: 2,
      mfgYm: "2019-11",
      replaceCount: 1,
      replacements: [{ reason: "detached", batteryType: null, flags: [] }],
      extinguisherInstalled: "missing",
      rxDone: "done",
      revisit: "not-needed",
      note: "소화기 미설치 — 설치 권고 안내문 전달",
    }),
  },

  /* ── 2026-07 ────────────────────────────────────────────────────────── */
  {
    id: "R-20260706-1",
    day: "20260706",
    time: "09:40",
    buildingRank: 1,
    address: "관악구 은천로 39길 12",
    unitLabel: "1층 101호",
    inspectorName: "이영선",
    form: form("1층 101호", {
      consent: "accepted",
      respondent: "owner",
      roomCount: 3,
      mfgYm: "2022-03",
      replaceCount: 0,
      extinguisherInstalled: "installed",
      rxDone: "advised-only",
      revisit: "not-needed",
    }),
  },
  {
    id: "R-20260706-2",
    day: "20260706",
    time: "10:15",
    buildingRank: 1,
    address: "관악구 은천로 39길 12",
    unitLabel: "1층 102호",
    inspectorName: "이영선",
    /* 일체형 방전 — 전지 교체가 불가해 처방이 RX-IOT로 뒤집히는 케이스 */
    form: form("1층 102호", {
      consent: "accepted",
      respondent: "family",
      roomCount: 2,
      mfgYm: "2018-06",
      replaceCount: 1,
      replacements: [{ reason: "battery-dead", batteryType: "sealed", flags: [] }],
      extinguisherInstalled: "installed",
      rxDone: "advised-only",
      revisit: "revisit",
    }),
  },
  {
    id: "R-20260709-1",
    day: "20260709",
    time: "09:30",
    buildingRank: 1,
    address: "관악구 은천로 39길 12",
    unitLabel: "2층 201호",
    inspectorName: "이영선",
    /* 실측 제조년월이 15년 초과 → 개수 입력 없이 전량 교체 */
    form: form("2층 201호", {
      consent: "accepted",
      respondent: "owner",
      roomCount: 3,
      mfgYm: "2009-04",
      extinguisherInstalled: "installed",
      rxDone: "done",
      revisit: "not-needed",
      note: "라벨 확인 — 2009년 4월 제조, 내용연수 경과",
    }),
  },
  {
    id: "R-20260709-2",
    day: "20260709",
    time: "10:05",
    buildingRank: 1,
    address: "관악구 은천로 39길 12",
    unitLabel: "2층 202호",
    inspectorName: "이영선",
    form: form("2층 202호", {
      consent: "refused",
      refusalReason: "no-need",
      revisit: "revisit",
    }),
  },
  {
    id: "R-20260709-3",
    day: "20260709",
    time: "10:20",
    buildingRank: 1,
    address: "관악구 은천로 39길 12",
    unitLabel: "2층 203호",
    inspectorName: "이영선",
    form: form("2층 203호", {
      consent: "vacant",
      revisit: "revisit",
    }),
  },
  {
    id: "R-20260713-1",
    day: "20260713",
    time: "13:50",
    buildingRank: 1,
    address: "관악구 은천로 39길 12",
    unitLabel: "3층 301호",
    inspectorName: "이영선",
    /* 커버 파손은 중대결함 → 외관이상이어도 DEFECTIVE */
    form: form("3층 301호", {
      consent: "accepted",
      respondent: "owner",
      roomCount: 4,
      mfgYm: "2020-08",
      replaceCount: 2,
      replacements: [
        { reason: "appearance", batteryType: null, flags: ["cover-damage"] },
        { reason: "unmarked", batteryType: null, flags: [] },
      ],
      extinguisherInstalled: "installed",
      rxDone: "done",
      revisit: "not-needed",
    }),
  },
  {
    id: "R-20260713-2",
    day: "20260713",
    time: "15:20",
    buildingRank: 2,
    address: "관악구 은천로 41",
    unitLabel: "1층 우",
    inspectorName: "이영선",
    form: form("1층 우", {
      consent: "accepted",
      respondent: "tenant",
      roomCount: 2,
      mfgYm: "2023-01",
      replaceCount: 0,
      extinguisherInstalled: "installed",
      rxDone: "advised-only",
      revisit: "not-needed",
    }),
  },
  {
    id: "R-20260715-1",
    day: "20260715",
    time: "11:05",
    buildingRank: 4,
    address: "관악구 은천로 52길 3",
    unitLabel: "본가구",
    inspectorName: "이영선",
    form: form("본가구", {
      consent: "accepted",
      respondent: "owner",
      roomCount: 2,
      mfgYm: "2019-06",
      replaceCount: 1,
      replacements: [{ reason: "battery-dead", batteryType: "replaceable", flags: [] }],
      extinguisherInstalled: "installed",
      rxDone: "done",
      revisit: "not-needed",
      note: "현장에서 전지 교체 완료. 작동시험 정상",
    }),
  },
  {
    id: "R-20260720-1",
    day: "20260720",
    time: "09:55",
    buildingRank: 3,
    address: "관악구 성현로 8",
    unitLabel: "2층 201호",
    inspectorName: "이영선",
    form: form("2층 201호", {
      consent: "accepted",
      respondent: "owner",
      roomCount: 3,
      mfgYm: "2013-05",
      replaceCount: 1,
      replacements: [{ reason: "appearance", batteryType: null, flags: ["stain"] }],
      extinguisherInstalled: "missing",
      rxDone: "advised-only",
      revisit: "revisit",
    }),
  },
  {
    id: "R-20260720-2",
    day: "20260720",
    time: "10:30",
    buildingRank: 3,
    address: "관악구 성현로 8",
    unitLabel: "2층 202호",
    inspectorName: "이영선",
    form: form("2층 202호", {
      consent: "refused",
      refusalReason: "no-time",
      revisit: "revisit",
    }),
  },
  {
    id: "R-20260727-1",
    day: "20260727",
    time: "14:40",
    buildingRank: 2,
    address: "관악구 은천로 41",
    unitLabel: "3층 좌",
    inspectorName: "이영선",
    form: form("3층 좌", {
      consent: "accepted",
      respondent: "etc",
      roomCount: 3,
      mfgYm: "2009-04",
      extinguisherInstalled: "installed",
      rxDone: "advised-only",
      revisit: "revisit",
      note: "소유자 부재, 관리인 응대 — 교체 결정 보류",
    }),
  },
];

/** 캘린더 점 표식용 — 기록이 하나라도 있는 날 */
export const RECORD_DAYS: ReadonlySet<string> = new Set(
  INSPECTION_RECORDS.map((r) => r.day),
);

export function recordsOf(day: string | null): InspectionRecord[] {
  if (!day) return [];
  return INSPECTION_RECORDS.filter((r) => r.day === day).sort((a, b) =>
    a.time.localeCompare(b.time),
  );
}

/** YYYYMM에 속한 기록 수 — 툴바 요약 */
export function recordCountOfMonth(month: string): number {
  return INSPECTION_RECORDS.filter((r) => r.day.startsWith(month)).length;
}

/** 한 세대의 지난 방문 이력 — 최신순. 점검 폼이 게이트 단계에서 보여준다. */
export function recordsOfUnit(buildingRank: number, unitLabel: string): InspectionRecord[] {
  return INSPECTION_RECORDS.filter(
    (r) => r.buildingRank === buildingRank && r.unitLabel === unitLabel,
  ).sort((a, b) => (b.day + b.time).localeCompare(a.day + a.time));
}
