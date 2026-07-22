import { VISIT_STATUS, type StatusTone, type VisitStatus } from "@/config/domain";
import { cn } from "@/lib/utils";

/* 톤 슬롯 → semantic 토큰. 상태명은 config/domain.ts에서만 주입된다(모델 미합의). */
const TONE_CLASS: Record<StatusTone, string> = {
  neutral: "bg-status-neutral-tint text-body",
  positive: "bg-status-positive-tint text-status-positive",
  negative: "bg-status-negative-tint text-status-negative",
  caution: "bg-status-caution-tint text-status-caution",
  info: "bg-status-info-tint text-status-info",
};

export interface StatusTagProps {
  status: VisitStatus;
  className?: string;
}

export function StatusTag({ status, className }: StatusTagProps) {
  const { label, tone } = VISIT_STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 py-0.5 text-caption",
        TONE_CLASS[tone],
        className,
      )}
      aria-label={`점검 상태: ${label}`}
    >
      {label}
    </span>
  );
}
