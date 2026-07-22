import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * 데이터 값 표기 래퍼 — risk_score·grid_id·rx_code·좌표·건수 등.
 * 폰트는 본문과 동일한 Pretendard. 숫자 열 정렬을 위해 tabular 숫자만 적용한다
 * (별도 서체가 아니라 Pretendard의 tabular figure 변형).
 */
export function DataText({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return <span className={cn("tabular-nums", className)} {...props} />;
}
