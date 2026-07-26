import type * as React from "react";
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
  /**
   * 3열 슬롯 교체 — undefined면 StatusTag(관제 기본), null이면 빈 슬롯(B3 단독주택).
   * 루트가 <button>이라 **비대화형 콘텐츠만** 넘길 것 (버튼 중첩 금지).
   */
  trailing?: React.ReactNode | null;
  /** 주소 아래 보조줄 교체 — 미전달 시 처방 기준(관제 기본). 역시 비대화형만 */
  caption?: React.ReactNode;
  className?: string;
}

export function QueueRow({
  item,
  density = "control",
  selected,
  dimmed,
  disabled,
  onSelect,
  trailing,
  caption,
  className,
}: QueueRowProps) {
  /* /field는 보조줄이 길어(점검일·보급일·주택유형) 가운데 열에 가두면 잘린다 →
     주소 아래 전체 폭 한 줄로 뺀다. 행 높이는 64px 그대로. */
  const captionFullWidth = density === "field";
  const captionNode = caption ?? (
    <>
      {item.basis} · <DataText>{item.rx}</DataText> {RX[item.rx].label}
    </>
  );

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "grid w-full grid-cols-[2rem_1fr_auto_auto] items-center gap-x-3 border-b border-hairline border-l-4 border-l-transparent bg-surface px-3 text-left hover:bg-surface-muted",
        DENSITY_CLASS[density],
        selected && "border-l-brand bg-brand-tint hover:bg-brand-tint",
        dimmed && "opacity-50",
        disabled && "cursor-not-allowed opacity-50 hover:bg-surface",
        className,
      )}
    >
      <DataText className={cn("text-subtle", captionFullWidth && "row-span-2")}>
        {item.rank}
      </DataText>
      <span className="min-w-0">
        <span className="block truncate text-ink">{item.address}</span>
        {!captionFullWidth && (
          <span className="block truncate text-caption font-normal text-subtle">
            {captionNode}
          </span>
        )}
      </span>
      {trailing === undefined ? <StatusTag status={item.status} /> : trailing}
      <RiskBadge level={item.level} score={item.riskScore} estimated={item.estimated} />
      {captionFullWidth && (
        <span className="col-span-3 col-start-2 block truncate text-caption font-normal text-subtle">
          {captionNode}
        </span>
      )}
    </button>
  );
}
