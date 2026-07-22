import type * as React from "react";
import { cn } from "@/lib/utils";

/**
 * 지도 플레이스홀더 — 동 경계 GeoJSON 미확보 (DESIGN.md Known Gaps).
 * 컨테이너 크기는 레이아웃이 고정한다 (폴링 갱신 CLS 0).
 */
export function MapPlaceholder({
  label,
  children,
  className,
}: {
  label: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "relative flex min-h-0 flex-1 flex-col items-center justify-center gap-1 overflow-hidden rounded-md border border-hairline bg-surface",
        className,
      )}
    >
      <span className="text-body-sm text-subtle">{label}</span>
      <span className="text-caption text-subtle">지도 영역 (react-leaflet + OSM 예정)</span>
      {children}
    </div>
  );
}
