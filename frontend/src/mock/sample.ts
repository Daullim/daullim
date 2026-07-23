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
    { value: "boramae", label: "보라매동" },
    { value: "nakseongdae", label: "낙성대동" },
    { value: "inheon", label: "인헌동" },
    { value: "namhyeon", label: "남현동" },
  ],
  imsil: [
    { value: "imsil-eup", label: "임실읍" },
    { value: "cheongung", label: "청웅면" },
    { value: "unam", label: "운암면" },
  ],
};

/** 도농 자동판별 결과 (샘플) */
export const RURAL_SIGUNGU = new Set(["imsil"]);

/** 로그인 계정 (샘플) — 상단바·드로어 공용 */
export const INSPECTOR = {
  name: "이영선",
  rank: "주임",
  title: "점검관",
  org: "관악소방서 · 예방안전3팀",
};

export interface DongSummary {
  households: number;
  avgRisk: { score: number; level: RiskLevel };
}

/** B1 동별 요약 (샘플) — 카드 리스트는 avgRisk.score 내림차순으로 정렬해 표시 */
export const DONG_SUMMARY: Record<string, DongSummary> = {
  eunhcheon: { households: 159, avgRisk: { score: 62.4, level: "warn" } },
  seonghyeon: { households: 214, avgRisk: { score: 71.8, level: "danger" } },
  cheongnim: { households: 87, avgRisk: { score: 45.2, level: "warn" } },
  haengun: { households: 132, avgRisk: { score: 28.9, level: "ok" } },
  boramae: { households: 178, avgRisk: { score: 83.6, level: "danger" } },
  nakseongdae: { households: 121, avgRisk: { score: 57.9, level: "warn" } },
  inheon: { households: 94, avgRisk: { score: 38.4, level: "warn" } },
  namhyeon: { households: 143, avgRisk: { score: 19.5, level: "ok" } },
  "imsil-eup": { households: 96, avgRisk: { score: 74.1, level: "danger" } },
  cheongung: { households: 41, avgRisk: { score: 66.3, level: "warn" } },
  unam: { households: 58, avgRisk: { score: 52.7, level: "warn" } },
};

export interface GridItem {
  gridId: string;
  /** 사용자용 구역 번호 — 발번 규칙 미정, mock 고정값 (DESIGN.md Known Gaps) */
  zone: number;
  households: number;
  visited: number;
  /** 현재 위치 기준 거리 — 지도 연동 전 mock (ADR-004 보류) */
  distanceKm: number;
  riskScore: number;
  level: RiskLevel;
}

/** B2 — 관악구 은천동 500m 격자 우선순위 (도시 전용). 정렬 기준별 순서가 달라지도록 값 설계 */
export const GRIDS: GridItem[] = [
  { gridId: "GA-0412", zone: 1, households: 42, visited: 12, distanceKm: 1.8, riskScore: 91.2, level: "danger" },
  { gridId: "GA-0413", zone: 2, households: 37, visited: 29, distanceKm: 0.4, riskScore: 78.4, level: "danger" },
  { gridId: "GA-0398", zone: 3, households: 51, visited: 8, distanceKm: 2.6, riskScore: 55.1, level: "warn" },
  { gridId: "GA-0421", zone: 4, households: 29, visited: 21, distanceKm: 0.9, riskScore: 22.7, level: "ok" },
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
