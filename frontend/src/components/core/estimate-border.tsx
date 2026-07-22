import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * 실측/추정 구분 래퍼 — 색이 아니라 형태(실선/점선)로 구분한다 (DESIGN.md Shapes).
 * estimated면 '(추정)' 라벨이 자동으로 붙는다.
 */
export interface EstimateBorderProps extends React.ComponentProps<"div"> {
  kind: "measured" | "estimated";
}

export function EstimateBorder({
  kind,
  className,
  children,
  ...props
}: EstimateBorderProps) {
  return (
    <div
      className={cn(
        "rounded-md border border-hairline-strong p-3",
        kind === "estimated" && "border-dashed",
        className,
      )}
      {...props}
    >
      {children}
      {kind === "estimated" && (
        <span className="mt-1 block text-caption text-subtle">(추정)</span>
      )}
    </div>
  );
}
