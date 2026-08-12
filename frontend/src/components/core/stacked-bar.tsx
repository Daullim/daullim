import { DataText } from "@/components/core/data-text";
import { RISK_LEVEL, type RiskLevel } from "@/config/domain";
import { cn } from "@/lib/utils";

const SEGMENT_CLASS: Record<RiskLevel, string> = {
  danger: "bg-risk-danger/70 border-risk-danger text-risk-danger",
  warn: "bg-risk-warn/70 border-risk-warn text-risk-warn",
  ok: "bg-risk-ok/70 border-risk-ok text-risk-ok",
};

const TEXT_CLASS: Record<RiskLevel, string> = {
  danger: "text-risk-danger",
  warn: "text-risk-warn",
  ok: "text-risk-ok",
};

export interface StackedBarSegment {
  level: RiskLevel;
  value: number;
  label?: string;
}

export function StackedBar({
  segments,
  className,
}: {
  segments: StackedBarSegment[];
  className?: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className="flex h-4 overflow-hidden rounded-xs border border-hairline bg-surface-muted"
        role="img"
        aria-label={segments
          .map(
            (segment) =>
              `${segment.label ?? RISK_LEVEL[segment.level].label} ${segment.value.toLocaleString()}`,
          )
          .join(", ")}
      >
        {segments.map((segment) => {
          const percent = total === 0 ? 0 : (segment.value / total) * 100;
          return (
            <span
              key={segment.level}
              aria-hidden
              className={cn("h-full border-r last:border-r-0", SEGMENT_CLASS[segment.level])}
              style={{
                flexBasis: `${percent}%`,
                minWidth: segment.value > 0 ? 1 : 0,
              }}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((segment) => (
          <span
            key={segment.level}
            className="inline-flex items-center gap-1.5 text-caption text-body"
          >
            <span
              aria-hidden
              className={cn("size-2 rounded-xs border", SEGMENT_CLASS[segment.level])}
            />
            {segment.label ?? RISK_LEVEL[segment.level].label}
            <DataText className={TEXT_CLASS[segment.level]}>{segment.value.toLocaleString()}</DataText>
          </span>
        ))}
      </div>
    </div>
  );
}
