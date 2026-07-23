import { Minus, Plus } from "lucide-react";

/**
 * 지도 확대/축소 컨트롤 (B2·B3) — 좌하단 범례 위, 세로 정사각 버튼(+ 위 / - 아래).
 * 지도 미실장(ADR-004 §2~4 보류) — 연동 전까지 동작 없음.
 */
export function MapZoomControls() {
  return (
    <div className="absolute bottom-16 left-3 z-10 flex flex-col overflow-hidden rounded-md border border-hairline bg-surface shadow-e1">
      <button
        type="button"
        aria-label="지도 확대"
        className="flex size-12 items-center justify-center hover:bg-surface-muted"
      >
        <Plus aria-hidden className="size-5 text-body" />
      </button>
      <div aria-hidden className="border-t border-hairline" />
      <button
        type="button"
        aria-label="지도 축소"
        className="flex size-12 items-center justify-center hover:bg-surface-muted"
      >
        <Minus aria-hidden className="size-5 text-body" />
      </button>
    </div>
  );
}
