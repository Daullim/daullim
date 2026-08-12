import { DataText } from "@/components/core/data-text";
import { cn } from "@/lib/utils";

export interface BarRowProps {
  label: string;
  value: number;
  max: number;
  valueLabel?: string;
  estimated?: boolean;
  valueWidth?: "fixed" | "auto";
  className?: string;
}

export function BarRow({
  label,
  value,
  max,
  valueLabel,
  estimated,
  valueWidth = "fixed",
  className,
}: BarRowProps) {
  const percent = max <= 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div
      className={cn(
        valueWidth === "fixed"
          ? "grid grid-cols-[minmax(4.5rem,8rem)_minmax(5rem,1fr)_minmax(5rem,10rem)] items-center gap-3"
          : "grid grid-cols-[minmax(5rem,8rem)_1fr_auto] items-center gap-3",
        className,
      )}
    >
      <span className="truncate text-body-sm text-body">{label}</span>
      <span
        aria-hidden
        className={cn(
          "h-3 overflow-hidden rounded-xs border border-transparent bg-surface-muted",
          estimated && "border-dashed border-hairline-strong",
        )}
      >
        <span className="block h-full bg-brand" style={{ width: `${percent}%` }} />
      </span>
      <DataText className="min-w-14 text-right text-body-sm text-ink">
        {valueLabel ?? value.toLocaleString()}
      </DataText>
    </div>
  );
}
