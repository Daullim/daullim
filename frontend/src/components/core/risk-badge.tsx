import { RISK_LEVEL, type RiskLevel } from "@/config/domain";
import { DataText } from "@/components/core/data-text";
import { cn } from "@/lib/utils";

const LEVEL_CLASS: Record<RiskLevel, string> = {
  danger: "bg-risk-danger-tint text-risk-danger border-risk-danger-line",
  warn: "bg-risk-warn-tint text-risk-warn border-risk-warn-line",
  ok: "bg-risk-ok-tint text-risk-ok border-risk-ok-line",
};

export interface RiskBadgeProps {
  level: RiskLevel;
  /** risk_score — 색 단독 금지 원칙상 라벨과 함께 수치 병기를 권장 */
  score?: number;
  /** 추정값이면 점선 보더 + (추정) 라벨 (색이 아닌 형태로 구분) */
  estimated?: boolean;
  className?: string;
}

export function RiskBadge({ level, score, estimated, className }: RiskBadgeProps) {
  const { label } = RISK_LEVEL[level];
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-sm border px-2 text-caption",
        LEVEL_CLASS[level],
        estimated && "border-dashed",
        className,
      )}
      aria-label={`위험 등급 ${label}${score != null ? `, 점수 ${score}` : ""}${estimated ? " (추정)" : ""}`}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {label}
      {score != null && <DataText>{score.toFixed(1)}</DataText>}
      {estimated && <span className="font-normal">(추정)</span>}
    </span>
  );
}
