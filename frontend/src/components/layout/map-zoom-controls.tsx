import { Minus, Plus } from "lucide-react";

/**
 * 지도 확대/축소 컨트롤 (B2·B3) — 좌하단 범례 위, 세로 정사각 버튼(+ 위 / - 아래).
 */
export function MapZoomControls({ map }: { map: naver.maps.Map | null }) {
  const setZoomBy = (delta: number) => {
    if (!map) return;
    map.setZoom(map.getZoom() + delta, true);
  };

  return (
    <div className="absolute bottom-16 left-3 z-10 flex flex-col overflow-hidden rounded-md border border-hairline bg-surface shadow-e1">
      <button
        type="button"
        aria-label="지도 확대"
        disabled={!map}
        onClick={() => setZoomBy(1)}
        className="flex size-12 items-center justify-center hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-surface"
      >
        <Plus aria-hidden className="size-5 text-body" />
      </button>
      <div aria-hidden className="border-t border-hairline" />
      <button
        type="button"
        aria-label="지도 축소"
        disabled={!map}
        onClick={() => setZoomBy(-1)}
        className="flex size-12 items-center justify-center hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-surface"
      >
        <Minus aria-hidden className="size-5 text-body" />
      </button>
    </div>
  );
}
