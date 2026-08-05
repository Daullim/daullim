/**
 * 남은 목데이터 — **화면 데이터는 전부 API로 옮겼다**(#26).
 *
 * 여기 남은 둘은 아직 서버가 답을 줄 수 없는 것들이다:
 * - `INSPECTOR` — `GET /auth/me`가 미구현(#23 미머지)
 * - `DEMO_QUEUE_ITEMS` — `/demo`는 컴포넌트 상태 매트릭스를 보는 하네스라 서버 없이 떠야 한다
 *
 * 값은 실데이터의 생김새를 따른다 — `basis`는 "미보급 · 동선 N", `installDay`는 null이다.
 * 목데이터가 실데이터보다 예뻐 보이면 화면이 거짓말을 하게 된다.
 */
import type { BuildingQueueItem } from "@/api/types";

/** 로그인 계정 (샘플) — 상단바·드로어 공용 */
export const INSPECTOR = {
  name: "이영선",
  rank: "주임",
  title: "점검관",
  org: "관악소방서 · 예방안전3팀",
};

/** /demo 전용 — 컴포넌트 상태 매트릭스용 2행 (정상 · 추정) */
export const DEMO_QUEUE_ITEMS: BuildingQueueItem[] = [
  {
    buildingId: 1,
    orderKey: 5407,
    address: "서울특별시 관악구 광신1길 15",
    houseTypeCd: "multi-unit",
    score: 100,
    riskLevelCd: "danger",
    isEstimated: false,
    basis: "미보급 · 동선 5407",
    rxCodeCd: "RX-IOT",
    lat: 37.4794,
    lng: 126.9317,
    installDay: null,
    lastInspectedDay: null,
    unitCount: 8,
    unitDoneCount: 2,
  },
  {
    buildingId: 2,
    orderKey: 8004,
    address: "서울특별시 관악구 관천로 56-7",
    houseTypeCd: "detached",
    score: 82.15,
    riskLevelCd: "danger",
    /* 지번 폴백 행 — 점선 테두리 규칙이 걸린다 */
    isEstimated: true,
    basis: "미보급 · 동선 8004",
    rxCodeCd: "RX-BAT",
    lat: 37.4848,
    lng: 126.9263,
    installDay: null,
    lastInspectedDay: null,
    unitCount: 1,
    unitDoneCount: 0,
  },
];
