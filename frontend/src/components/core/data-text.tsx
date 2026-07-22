import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * 데이터 값 표기 래퍼 — risk_score·grid_id·rx_code·좌표·건수 등
 * "값이면 무조건 mono" 원칙의 강제 장치 (DESIGN.md Typography).
 */
export function DataText({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return <span className={cn("font-mono", className)} {...props} />;
}
