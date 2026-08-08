import type { VisitSubmitRequest } from "@/api/types";

/**
 * 전송하지 못한 점검 1건 — 오프라인 보관함.
 *
 * **1건만 보관한다**(DESIGN.md § System States, PRD 확정). 큐가 아니라 한 칸인 이유는
 * 점검원이 한 번에 한 세대를 돌기 때문이다 — 밀린 게 여러 건이면 어느 것이 어느 세대인지
 * 화면에서 구분해 줘야 하고, 그건 3주 MVP의 범위가 아니다. 보관 중에 다른 세대를 저장하면
 * 그 건이 앞선 것을 덮는다.
 *
 * `idempotencyKey`를 함께 들고 있는 게 핵심이다. 재전송이 같은 키로 나가므로 앞선 요청이
 * 실은 서버에 닿아 있었더라도 중복 저장되지 않고 기존 결과가 돌아온다.
 *
 * 계정·비밀번호를 저장하지 않는 원칙은 그대로다(`lib/prefs.ts`·`api/token.ts`와 같다).
 */
const KEY = "daullim.pendingVisit";

export interface PendingVisit {
  unitId: number;
  /** 이 세대를 화면에 되짚기 위한 값 — 재전송 성공 시 어느 행을 갱신할지 정한다 */
  buildingId: number;
  unitLabel: string;
  body: VisitSubmitRequest;
  idempotencyKey: string;
  /** 보관 시각 (ISO) — 안내 문구에 "언제 것"인지 보이려면 필요하다 */
  savedAt: string;
}

export function loadPendingVisit(): PendingVisit | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingVisit) : null;
  } catch {
    /* storage 차단·깨진 JSON — 보관함이 없는 것으로 본다 */
    return null;
  }
}

export function savePendingVisit(pending: PendingVisit): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(pending));
  } catch {
    /* 저장 실패해도 화면은 오류를 이미 보여 준다 */
  }
}

export function clearPendingVisit(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* 지우지 못해도 같은 키로 재전송하면 서버가 중복을 막는다 */
  }
}
