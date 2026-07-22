import * as React from "react";
import { Button as UIButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "danger";
type Size = "md" | "field-xl";

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "bg-brand text-on-accent hover:bg-brand-hover",
  secondary:
    "border-hairline-strong bg-surface text-ink hover:bg-surface-muted hover:text-ink",
  danger: "bg-risk-danger text-on-accent hover:bg-risk-danger/90",
};

const SIZE_CLASS: Record<Size, string> = {
  md: "h-10 gap-2 rounded-md px-4 text-btn",
  "field-xl": "h-16 gap-2 rounded-md px-6 text-title-sm",
};

export interface ButtonProps
  extends Omit<React.ComponentProps<"button">, "className"> {
  variant?: Variant;
  size?: Size;
  /** 레이아웃 여백 조정 전용 — 색·폰트 오버라이드 금지 (DESIGN.md) */
  className?: string;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <UIButton
      variant={variant === "secondary" ? "outline" : "default"}
      className={cn(VARIANT_CLASS[variant], SIZE_CLASS[size], className)}
      {...props}
    />
  );
}
