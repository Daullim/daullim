import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * 관제 탭의 카드 골격 — 제목 한 줄 + 내용. 탭마다 다시 만들지 않는다.
 *
 * **제목 크기는 선택지를 두지 않는다**(`{typography.title-lg}` 20px 고정) — prop으로 열어 두면
 * 탭마다 갈리고, 그게 DESIGN.md § 관제 제목 3단을 만든 이유다. 더 큰 제목이 필요하면
 * 그건 패널이 아니라 화면 제목이다.
 */
export function ControlPanel({
  title,
  action,
  children,
  className,
}: {
  title: string;
  /** 제목 줄 우측 슬롯 — 기간 선택·링크 등 */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-md border border-hairline bg-surface p-4", className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="text-title-lg text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
