import { OFFICER_TITLE } from "@/config/domain";
import type { CurrentUser } from "@/api/types";

/**
 * 이름 옆 표기 — 상단바·드로어·설정이 같은 문자열을 쓴다.
 *
 * 세 곳이 각자 조합하다 서로 다른 값을 보이던 것을 여기로 모았다.
 * 조회 전이거나 실패했으면 "사용자"로 자리를 지킨다(폭이 흔들리지 않게).
 */
export function displayName(user?: CurrentUser): string {
  return `${user?.name ?? "사용자"} ${OFFICER_TITLE}`;
}
