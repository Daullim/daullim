import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import { AppDrawer } from "@/components/layout/app-drawer";
import { INSPECTOR } from "@/mock/sample";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  to?: string;
}

function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="드릴다운 경로" className="flex min-w-0 items-center gap-2">
      {crumbs.map((c, i) => (
        <span key={c.label} className="flex min-w-0 items-center gap-2">
          {i > 0 && (
            <span aria-hidden className="text-subtle">
              ›
            </span>
          )}
          {c.to ? (
            <Link to={c.to} className="truncate text-title text-brand">
              {c.label}
            </Link>
          ) : (
            <span className="truncate text-title text-ink">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/** 우측 계정 표기 — `소속 | 이름 직급` (양 모드 공통) */
function Account({ className }: { className?: string }) {
  return (
    <span className={cn("ml-auto flex shrink-0 items-center gap-2", className)}>
      <span className="text-subtle">{INSPECTOR.org}</span>
      <span aria-hidden className="text-hairline-strong">
        |
      </span>
      <span className="text-body">
        {INSPECTOR.name} {INSPECTOR.rank}
      </span>
    </span>
  );
}

function HamburgerButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="메뉴 열기"
      onClick={onClick}
      className="flex size-11 shrink-0 items-center justify-center rounded-md hover:bg-surface-muted"
    >
      <Menu aria-hidden className="size-6 text-ink" />
    </button>
  );
}

/**
 * 상단바 — 화면당 메뉴바는 이것 하나뿐 (DESIGN.md Layout).
 * control: 햄버거+로고+계정. field: 햄버거+브레드크럼+계정, 64px.
 * 드로어는 양 모드 공용(AppDrawer) — 하단 버튼만 모드별로 다르다.
 */
export function TopBar({
  mode,
  crumbs,
}: {
  mode: "control" | "field";
  crumbs?: Crumb[];
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (mode === "control") {
    return (
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-hairline bg-surface px-3">
        <HamburgerButton onClick={() => setDrawerOpen(true)} />
        <Link to="/" className="text-title text-ink">
          다울림
        </Link>
        <Account className="text-body-sm" />
        <AppDrawer mode="control" open={drawerOpen} onOpenChange={setDrawerOpen} />
      </header>
    );
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-hairline bg-surface px-3">
      <HamburgerButton onClick={() => setDrawerOpen(true)} />
      {crumbs && <Breadcrumb crumbs={crumbs} />}
      <Account className="text-body-md" />
      <AppDrawer mode="field" open={drawerOpen} onOpenChange={setDrawerOpen} />
    </header>
  );
}
