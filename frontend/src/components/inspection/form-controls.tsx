import type * as React from "react";
import { CONDITION_CODE, type ConditionCode, type StatusTone } from "@/config/domain";
import { DataText } from "@/components/core/data-text";
import { cn } from "@/lib/utils";

/* 선택형 버튼 공통 — Active·Selected = 악센트 틴트 + 악센트 보더 (기존 choiceClass 문법) */
function choiceClass(selected: boolean) {
  return cn(
    "rounded-md border text-title-sm text-ink hover:bg-surface-muted",
    selected
      ? "border-brand bg-brand-tint text-brand-hover hover:bg-brand-tint"
      : "border-hairline-strong bg-surface",
  );
}

/**
 * 선택형 버튼 그룹 — 열거값 Record(config/domain.ts)를 주입받아 렌더.
 * size lg=64px(장갑 착용 주요 입력), sm=44px(보조 radio).
 */
export function ChoiceGroup<K extends string>({
  options,
  value,
  onChange,
  size = "sm",
  columns = 3,
  ariaPrefix,
  className,
}: {
  options: Record<K, { label: string }>;
  value: K | null;
  onChange: (key: K) => void;
  size?: "sm" | "lg";
  columns?: 2 | 3 | 4;
  /** 버튼 aria-label 접두어 (예: "작동 여부") */
  ariaPrefix?: string;
  className?: string;
}) {
  const colClass = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" }[columns];
  return (
    <div className={cn("grid gap-2", colClass, className)}>
      {(Object.keys(options) as K[]).map((k) => (
        <button
          key={k}
          type="button"
          aria-pressed={value === k}
          aria-label={ariaPrefix ? `${ariaPrefix}: ${options[k].label}` : undefined}
          onClick={() => onChange(k)}
          className={cn(size === "lg" ? "h-16" : "h-11 text-body-md", choiceClass(value === k))}
        >
          {options[k].label}
        </button>
      ))}
    </div>
  );
}

/** 폼 섹션 래퍼 — 섹션 제목 + hairline 구분 (간격은 부모 space-y-6 = 24px) */
export function FormSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-b border-hairline pb-6 last:border-b-0 last:pb-0", className)}>
      <h3 className="mb-3 text-title-sm text-ink">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

const TONE_CLASS: Record<StatusTone, string> = {
  neutral: "bg-status-neutral-tint text-status-neutral",
  positive: "bg-status-positive-tint text-status-positive",
  negative: "bg-status-negative-tint text-status-negative",
  caution: "bg-status-caution-tint text-status-caution",
  info: "bg-status-info-tint text-status-info",
};

/**
 * 판정 뱃지 — CONDITION_CODE 전용 (StatusTag는 VisitStatus 전용이라 자매 렌더).
 * estimated면 "(추정)" 동반 표기 (색이 아니라 라벨로 구분 — NFR-04).
 */
export function ConditionBadge({
  code,
  estimated = false,
  className,
}: {
  code: ConditionCode;
  estimated?: boolean;
  className?: string;
}) {
  const { label, tone } = CONDITION_CODE[code];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-caption",
        TONE_CLASS[tone],
        className,
      )}
    >
      <DataText>{code}</DataText> {label}
      {estimated && <span>(추정)</span>}
    </span>
  );
}
