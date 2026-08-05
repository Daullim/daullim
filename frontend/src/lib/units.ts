import type { UnitItem } from "@/api/types";

/**
 * 세대(호) 레이어 — 건물 1행 아래 실제 점검 단위.
 *
 * 목록은 서버가 준다(`GET /buildings/{id}/units`). 예전에는 주택유형별로 화면이 세대 행을 지어냈지만,
 * 이제 `units` 테이블이 진실원본이라 파생 규칙만 남는다. 점검 폼 상태(lib/inspection.ts)와 성격이 달라 분리돼 있다.
 */

/** 오늘 날짜를 대장 규약(YYYYMMDD)으로 — 저장 시 점검일 기록용 */
export function todayDay(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}`;
}

/** 표시용 라벨 — 층이 있으면 "3층 302호", 호수 미지정이면 "미지정" */
export function unitLabel(unit: UnitItem): string {
  const ho = unit.hoNm?.trim();
  if (!ho) return "미지정";
  return unit.flrNo != null ? `${unit.flrNo}층 ${ho}` : ho;
}

/** 완료 세대 수 */
export function doneCount(units: UnitItem[]): number {
  return units.filter((u) => u.statusCd === "done").length;
}

/**
 * 건물 완료 = 모든 세대 완료.
 *
 * 저장하지 않는 파생값이고 서버도 같은 규칙을 쓴다(`unitDoneCount === unitCount`) —
 * 저장 1회 = 건물 완료였던 과거 모델에선 다가구의 나머지 세대가 큐에서 사라졌다.
 */
export function isBuildingDone(units: UnitItem[] | undefined): boolean {
  return !!units?.length && doneCount(units) === units.length;
}

/** 큐 행의 집계로 판정하는 같은 규칙 — 세대 목록을 아직 안 받았을 때 쓴다 */
export function isQueueItemDone(item: { unitCount: number; unitDoneCount: number }): boolean {
  return item.unitCount > 0 && item.unitDoneCount === item.unitCount;
}

/** 다가구는 전유부가 없어 호수를 현장에서 받는다 — 그 행만 수정할 수 있다 */
export function isRenameable(unit: UnitItem): boolean {
  return unit.hoNmSourceCd === "field";
}
