import type * as React from "react";
import { cn } from "@/lib/utils";

/**
 * 정직성 라벨 — 디자인 요소로 상설화 (DESIGN.md §2-10).
 * 기본 문구는 도시 격자 리스트 표준 문구.
 */
export function HonestyLabel({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-sm bg-surface-muted px-3 py-2 text-caption text-body",
        className,
      )}
    >
      <span aria-hidden>ⓘ</span>
      <span>
        {children ?? "격자 순위 = AI 위험 예측 · 격자 안 주택 순서 = 보급연차·동선 기준"}
      </span>
    </p>
  );
}
