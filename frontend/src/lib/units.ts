import type { UnitStatus } from "@/config/domain";
import { EXPOS_UNITS, PRIOR_UNIT_VISITS, type HouseholdItem } from "@/mock/sample";

/**
 * 세대(호) 레이어 — 건물 1행 아래 실제 점검 단위.
 * 점검 폼 상태(lib/inspection.ts)와 성격이 달라 분리했다.
 */
export interface UnitRow {
  /** 전유부 hoNm 또는 현장 입력(다가구). 빈 문자열이면 미지정 */
  hoNm: string;
  /** 전유부 flrNo — 다가구·단독은 null */
  flrNo: number | null;
  status: UnitStatus;
  /** 이 세대의 마지막 점검일 (YYYYMMDD) — 이력 없으면 null */
  lastInspectedDay: string | null;
}

/** 오늘 날짜를 대장 규약(YYYYMMDD)으로 — 저장 시 점검일 기록용 */
export function todayDay(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}`;
}

/**
 * 주택유형별 초기 세대 목록.
 * - 단독·다중, 또는 세대수 1 → 1행("본가구" — lib/inspection.ts의 기존 표현을 그대로 쓴다)
 * - 다가구 → 전유부 0건(공부 구조상 없음)이라 세대수만큼 빈 행, 호수는 현장 입력
 * - 다세대·연립 → 전유부(getBrExposInfo) 호 목록, 없으면 세대수만큼 빈 행 폴백
 */
export function createInitialUnits(item: HouseholdItem): UnitRow[] {
  // 기존 목데이터의 완료 상태(rank 4)를 세대 레이어로 그대로 승계
  const status: UnitStatus = item.status === "done" ? "done" : "pending";
  const prior = PRIOR_UNIT_VISITS[item.rank] ?? [];
  /* 완료로 승계된 세대는 건물의 최근 점검일을 물려받고, 그 외엔 과거 방문 기록만 */
  const dayAt = (i: number) =>
    prior[i] ?? (status === "done" ? item.lastInspectedDay : null);

  if (item.unitCount <= 1 || item.houseType === "detached" || item.houseType === "multi-user") {
    return [{ hoNm: "본가구", flrNo: null, status, lastInspectedDay: dayAt(0) }];
  }

  if (item.houseType === "multi-unit" || item.houseType === "row-house") {
    const expos = EXPOS_UNITS[item.rank];
    if (expos?.length) {
      return expos.map((u, i) => ({
        hoNm: u.hoNm,
        flrNo: u.flrNo,
        status,
        lastInspectedDay: dayAt(i),
      }));
    }
  }

  return Array.from({ length: item.unitCount }, (_, i) => ({
    hoNm: "",
    flrNo: null,
    status,
    lastInspectedDay: dayAt(i),
  }));
}

/** 표시용 라벨 — 층이 있으면 "3층 302호", 호수 미입력이면 "미지정" */
export function unitLabel(unit: UnitRow): string {
  if (!unit.hoNm.trim()) return "미지정";
  return unit.flrNo != null ? `${unit.flrNo}층 ${unit.hoNm}` : unit.hoNm;
}

/** 완료 세대 수 */
export function doneCount(units: UnitRow[]): number {
  return units.filter((u) => u.status === "done").length;
}

/** 건물 완료 = 모든 세대 완료 (건물 단위 저장 개념을 대체하는 파생값) */
export function isBuildingDone(units: UnitRow[] | undefined): boolean {
  return !!units?.length && doneCount(units) === units.length;
}
