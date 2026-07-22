import { RISK_LEVEL, type RiskLevel } from "@/config/domain";
import { cn } from "@/lib/utils";

const DOT_CLASS: Record<RiskLevel, string> = {
  danger: "bg-risk-danger",
  warn: "bg-risk-warn",
  ok: "bg-risk-ok",
};

/** 위험 3구간 + 실선/점선(실측/추정) 범례 — 지도·리스트 화면 상시 노출 */
export function Legend({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-1 rounded-sm border border-hairline bg-surface px-3 py-1.5 text-caption text-body shadow-e1",
        className,
      )}
    >
      {(Object.keys(RISK_LEVEL) as RiskLevel[]).map((level) => (
        <span key={level} className="flex items-center gap-1.5">
          <span aria-hidden className={cn("size-2.5 rounded-full", DOT_CLASS[level])} />
          {RISK_LEVEL[level].label}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="w-5 border-t border-hairline-strong" />
        실측
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="w-5 border-t border-dashed border-hairline-strong" />
        추정
      </span>
    </div>
  );
}
