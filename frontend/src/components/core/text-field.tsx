import type * as React from "react";
import { cn } from "@/lib/utils";

/**
 * 라벨 + 입력 한 벌 — 인증·설정 화면 공용.
 * 입력 껍데기는 폼에서 쓰던 관례를 그대로 승계한다
 * (DESIGN.md: 입력 필드 {rounded.sm}·border-strong, /field 본문 최소 16px).
 */
export function TextField({
  id,
  label,
  hint,
  error,
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "className"> & {
  id: string;
  label: string;
  /** 보조 설명 — error가 있으면 가려진다 */
  hint?: string;
  error?: string;
  className?: string;
}) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={className}>
      <label className="mb-2 block text-body-md text-ink" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "h-11 w-full rounded-sm border bg-surface px-3 text-body-md text-ink placeholder:text-subtle",
          error ? "border-risk-danger" : "border-hairline-strong",
        )}
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-caption text-risk-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-caption text-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
