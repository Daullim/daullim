import type * as React from "react";
import { RX } from "@/config/domain";
import type { BuildingQueueItem } from "@/api/types";
import { DataText } from "@/components/core/data-text";
import { RiskBadge } from "@/components/core/risk-badge";
import { StatusTag } from "@/components/core/status-tag";
import { isQueueItemDone } from "@/lib/units";
import { cn } from "@/lib/utils";

type Density = "control" | "field";

/* 행 높이 고정 — 폴링 갱신 시 CLS 0 (DESIGN.md System States) */
const DENSITY_CLASS: Record<Density, string> = {
  control: "h-12 text-body-sm",
  field: "h-16 text-body-md",
};

export interface QueueRowProps {
  item: BuildingQueueItem;
  /**
   * 좌측 번호 — **목록 안에서 몇 번째인지**(index + 1)이지 `orderKey`가 아니다.
   * `orderKey`는 전역 순번이라 동을 걸러 보면 5407 같은 값이 튀어나와 화면에서 뜻을 잃는다.
   */
  rank: number;
  /** 지도에서 고른 행을 목록에서 찾아 스크롤하기 위한 앵커 */
  id?: string;
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
  rank,
  id,
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
  const captionNode =
    caption ??
    (item.rxCodeCd ? (
      <>
        {item.basis} · <DataText>{item.rxCodeCd}</DataText> {RX[item.rxCodeCd].label}
      </>
    ) : (
      /* 처방 코드가 없는 건물도 있다 — 근거만 남긴다 */
      item.basis
    ));

  return (
    <button
      id={id}
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
      <DataText className={cn("text-subtle", captionFullWidth && "row-span-2")}>{rank}</DataText>
      <span className="min-w-0">
        <span className="block truncate text-ink">{item.address}</span>
        {!captionFullWidth && (
          <span className="block truncate text-caption font-normal text-subtle">
            {captionNode}
          </span>
        )}
      </span>
      {/* 건물 상태는 저장값이 아니라 세대 집계에서 나온다 — 거부는 세대 축이라 여기선 2종뿐 */}
      {trailing === undefined ? (
        <StatusTag status={isQueueItemDone(item) ? "done" : "pending"} />
      ) : (
        trailing
      )}
      <RiskBadge level={item.riskLevelCd} score={item.score} estimated={item.isEstimated} />
      {captionFullWidth && (
        <span className="col-span-3 col-start-2 block truncate text-caption font-normal text-subtle">
          {captionNode}
        </span>
      )}
    </button>
  );
}
