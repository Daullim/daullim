import { RX } from "@/config/domain";
import type { HouseholdItem } from "@/mock/sample";
import { DataText } from "@/components/core/data-text";
import { RiskBadge } from "@/components/core/risk-badge";
import { StatusTag } from "@/components/core/status-tag";
import { cn } from "@/lib/utils";

type Density = "control" | "field";

/* 행 높이 고정 — 폴링 갱신 시 CLS 0 (DESIGN.md System States) */
const DENSITY_CLASS: Record<Density, string> = {
  control: "h-12 text-body-sm",
  field: "h-16 text-body-md",
};

export interface QueueRowProps {
  item: HouseholdItem;
  density?: Density;
  selected?: boolean;
  /** 완료 항목 흐리게 (B3 방문 큐) */
  dimmed?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
  className?: string;
}

export function QueueRow({
  item,
  density = "control",
  selected,
  dimmed,
  disabled,
  onSelect,
  className,
}: QueueRowProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "grid w-full grid-cols-[2rem_1fr_auto_auto] items-center gap-3 border-b border-hairline border-l-4 border-l-transparent bg-surface px-3 text-left hover:bg-surface-muted",
        DENSITY_CLASS[density],
        selected && "border-l-brand bg-brand-tint hover:bg-brand-tint",
        dimmed && "opacity-50",
        disabled && "cursor-not-allowed opacity-50 hover:bg-surface",
        className,
      )}
    >
      <DataText className="text-subtle">{item.rank}</DataText>
      <span className="min-w-0">
        <span className="block truncate text-ink">{item.address}</span>
        <span className="block truncate text-caption font-normal text-subtle">
          {item.basis} · <DataText>{item.rx}</DataText> {RX[item.rx].label}
        </span>
      </span>
      <StatusTag status={item.status} />
      <RiskBadge level={item.level} score={item.riskScore} estimated={item.estimated} />
    </button>
  );
}
