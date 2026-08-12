import { useOutletContext } from "react-router-dom";
import type { DashboardSummary } from "@/api/types";

/**
 * 관제 5탭이 공유하는 관할 스코프.
 *
 * 요약을 여기 실어 자식 탭이 같은 조회를 되풀이하지 않는다 — 캐시 계층이 없어(ADR-004 §3 v1.4)
 * 레이아웃 → 탭 통로가 화면 간 값 공유의 유일한 수단이다.
 */
export interface ControlScope {
  sidoCd?: string;
  sidoNm?: string;
  sigunguCd?: string;
  sigunguNm?: string;
  summary: DashboardSummary | undefined;
}

export function useControlScope() {
  return useOutletContext<ControlScope>();
}
