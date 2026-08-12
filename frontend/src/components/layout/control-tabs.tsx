import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * 관제 5탭 — 라우트 내비게이션이다.
 *
 * shadcn Tabs를 쓰지 않는 이유는 규칙 회피가 아니라 대상이 아니어서다(ADR-004 §1 v2.0).
 * 라우트 탭은 링크라 접근성이 기본으로 따라오고, roving tabindex·`aria-selected`를 흉내 낼 일이 없다.
 * `end`는 index 탭에만 붙인다 — 없으면 `/control`이 하위 경로에서도 활성으로 남는다.
 */
const TABS = [
  { to: "/control", label: "관내 현황", end: true },
  { to: "/control/risk", label: "위험 분석" },
  { to: "/control/progress", label: "추진 현황" },
  { to: "/control/materials", label: "소요 물량" },
  { to: "/control/report", label: "실적 통계" },
];

export function ControlTabs({ className }: { className?: string }) {
  return (
    <nav aria-label="관제 화면" className={cn("flex items-center gap-1", className)}>
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            cn(
              "flex h-10 items-center rounded-md px-3 text-title-sm",
              isActive ? "bg-brand-tint text-brand" : "text-body hover:bg-surface-muted",
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
