import { LocateFixed } from "lucide-react";

/**
 * 지도 하단 중앙 '현재 위치로 이동' 플로팅 버튼 (B2·B3).
 * 지도 미실장(ADR-004 §2~4 보류) — 연동 전까지 동작 없음.
 */
export function LocateButton() {
  return (
    <button
      type="button"
      aria-label="현재 위치로 이동"
      className="absolute bottom-3 left-1/2 z-10 flex h-12 -translate-x-1/2 items-center gap-2 rounded-md border border-hairline bg-surface px-4 shadow-e1 hover:bg-surface-muted"
    >
      <LocateFixed aria-hidden className="size-5 text-body" />
      <span className="text-body-md text-body">현재 위치</span>
    </button>
  );
}
