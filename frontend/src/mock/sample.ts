/**
 * 시연용 목데이터 — 샘플 월드는 서울 관악구(도시) + 전북 임실군(농촌)으로 통일.
 * 레이아웃 뼈대 검증용 3~4행 수준만 유지한다.
 */
import type { RiskLevel, RxCode, VisitStatus } from "@/config/domain";

export interface RegionOption {
  value: string;
  label: string;
}

export const SIDO: RegionOption[] = [
  { value: "seoul", label: "서울특별시" },
  { value: "jeonbuk", label: "전북특별자치도" },
];

export const SIGUNGU: Record<string, RegionOption[]> = {
  seoul: [{ value: "gwanak", label: "관악구" }],
  jeonbuk: [{ value: "imsil", label: "임실군" }],
};

export const DONG: Record<string, RegionOption[]> = {
  gwanak: [
    { value: "eunhcheon", label: "은천동" },
    { value: "seonghyeon", label: "성현동" },
    { value: "cheongnim", label: "청림동" },
    { value: "haengun", label: "행운동" },
  ],
  imsil: [
    { value: "imsil-eup", label: "임실읍" },
    { value: "cheongung", label: "청웅면" },
    { value: "unam", label: "운암면" },
  ],
};

/** 도농 자동판별 결과 (샘플) */
export const RURAL_SIGUNGU = new Set(["imsil"]);

export interface GridItem {
  gridId: string;
  households: number;
  riskScore: number;
  level: RiskLevel;
}

/** B2 — 관악구 은천동 500m 격자 우선순위 (도시 전용) */
export const GRIDS: GridItem[] = [
  { gridId: "GA-0412", households: 42, riskScore: 91.2, level: "danger" },
  { gridId: "GA-0413", households: 37, riskScore: 78.4, level: "danger" },
  { gridId: "GA-0398", households: 51, riskScore: 55.1, level: "warn" },
  { gridId: "GA-0421", households: 29, riskScore: 22.7, level: "ok" },
];

export interface HouseholdItem {
  rank: number;
  address: string;
  basis: string; // 분석 기준 (보급연차·동선 등)
  rx: RxCode;
  status: VisitStatus;
  riskScore: number;
  level: RiskLevel;
  estimated: boolean; // 추정값 여부 → 점선 규칙
  installYear: number;
  model: string;
}

/** B3·SCR-02 — 격자 GA-0412 내 방문 큐 (위험순) */
export const HOUSEHOLDS: HouseholdItem[] = [
  {
    rank: 1,
    address: "관악구 은천로 39길 12, 201호",
    basis: "보급 2016 · 동선 1",
    rx: "RX-BAT",
    status: "pending",
    riskScore: 91.2,
    level: "danger",
    estimated: false,
    installYear: 2016,
    model: "SD-100",
  },
  {
    rank: 2,
    address: "관악구 은천로 41, 지하 1호",
    basis: "보급 2017 · 동선 2",
    rx: "RX-IOT",
    status: "pending",
    riskScore: 84.6,
    level: "danger",
    estimated: true,
    installYear: 2017,
    model: "SD-100",
  },
  {
    rank: 3,
    address: "관악구 성현로 8, 302호",
    basis: "보급 2018 · 동선 3",
    rx: "RX-BAT",
    status: "vacant",
    riskScore: 58.3,
    level: "warn",
    estimated: true,
    installYear: 2018,
    model: "SD-200",
  },
  {
    rank: 4,
    address: "관악구 은천로 52길 3",
    basis: "보급 2019 · 동선 4",
    rx: "RX-BAT",
    status: "done",
    riskScore: 31.0,
    level: "ok",
    estimated: false,
    installYear: 2019,
    model: "SD-200",
  },
];

/** /control 하단 요약 카운터 (샘플) */
export const SUMMARY = {
  target: 1284,
  done: 402,
  danger: 213,
  updatedSecondsAgo: 7,
};
