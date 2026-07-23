import { useRef, useState } from "react";
import type * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/* 너비 클램프 — DESIGN.md Layout: 기본 400, 320~560px, 뷰포트 초과 방지 */
const MIN_W = 320;
const MAX_W = 560;
const KEY_STEP = 16;

function clamp(w: number) {
  return Math.min(MAX_W, Math.max(MIN_W, w), window.innerWidth - 24);
}

/* 사용자가 조절한 너비는 화면 이동(B2↔B3) 간 유지 — 새로고침 시 초기화(MVP 수용) */
let sharedWidth: number | null = null;

/* 접기/펼침 탭 — 시각 폭 24px, 투명 히트영역 44px (터치 타깃 규칙 유지) */
function CollapseTab({
  label,
  onClick,
  chevron,
  className,
}: {
  label: string;
  onClick: () => void;
  chevron: React.ReactNode;
  className: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`flex h-20 w-11 items-center ${className}`}
    >
      <span className="flex h-20 w-6 items-center justify-center rounded-l-md border border-r-0 border-hairline bg-surface shadow-e1 hover:bg-surface-muted">
        {chevron}
      </span>
    </button>
  );
}

/**
 * 전면 지도 위 우측 플로팅 패널 (B2·B3 공용) — 왼쪽 가장자리 드래그로 너비 조절,
 * 접기 버튼으로 완전 수납(수납 시 우측 끝 펼침 버튼만 남음). 새 의존성 없음.
 */
export function MapSidePanel({
  children,
  defaultWidth = 400,
  ariaLabel = "사이드 패널",
}: {
  children: React.ReactNode;
  defaultWidth?: number;
  ariaLabel?: string;
}) {
  const [width, setWidthState] = useState(() => sharedWidth ?? defaultWidth);
  const [collapsed, setCollapsed] = useState(false);
  const drag = useRef<{ startX: number; startW: number } | null>(null);

  const setWidth = (w: number) => {
    sharedWidth = w;
    setWidthState(w);
  };

  if (collapsed) {
    return (
      <CollapseTab
        label="패널 펼치기"
        onClick={() => setCollapsed(false)}
        chevron={<ChevronLeft aria-hidden className="size-5 text-body" />}
        className="absolute top-1/2 right-0 z-10 -translate-y-1/2 justify-end"
      />
    );
  }

  return (
    <aside
      aria-label={ariaLabel}
      className="absolute top-3 right-3 bottom-3 z-10"
      style={{ width: `min(${width}px, calc(100vw - 24px))` }}
    >
      {/* 접기 — 패널 왼쪽 모서리 중앙 부착 */}
      <CollapseTab
        label="패널 접기"
        onClick={() => setCollapsed(true)}
        chevron={<ChevronRight aria-hidden className="size-5 text-body" />}
        className="absolute top-1/2 -left-11 z-10 -translate-y-1/2 justify-end"
      />

      {/* 너비 조절 핸들 — 드래그 + 키보드 화살표 */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="패널 너비 조절"
        tabIndex={0}
        onPointerDown={(e) => {
          drag.current = { startX: e.clientX, startW: width };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          setWidth(clamp(drag.current.startW + (drag.current.startX - e.clientX)));
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setWidth(clamp(width + KEY_STEP));
          if (e.key === "ArrowRight") setWidth(clamp(width - KEY_STEP));
        }}
        className="absolute inset-y-0 left-0 z-10 w-2 cursor-col-resize rounded-l-md touch-none hover:bg-brand-line/60"
      />

      <div className="flex h-full flex-col overflow-hidden rounded-md border border-hairline bg-surface shadow-e2">
        {children}
      </div>
    </aside>
  );
}
