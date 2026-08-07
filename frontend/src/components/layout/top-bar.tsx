import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { AppDrawer } from "@/components/layout/app-drawer";
import { cn } from "@/lib/utils";
import { displayName } from "@/lib/user";
import { ApiError } from "@/api/client";
import { getCurrentUser } from "@/api/queries";
import type { CurrentUser } from "@/api/types";

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
function Account({ className, user }: { className?: string; user?: CurrentUser }) {
  const org = user?.orgName;
  return (
    <span className={cn("ml-auto flex shrink-0 items-center gap-2 pr-3", className)}>
      {org && <span className="text-subtle">{org}</span>}
      {org && (
        <span aria-hidden className="text-hairline-strong">
          |
        </span>
      )}
      <span className="text-body">{displayName(user)}</span>
    </span>
  );
}

/** 현장모드에서 곁길로 들어온 화면을 빠져나온다 — 장갑 조작이라 44px를 지킨다. */
function ExitButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="나가기"
      onClick={onClick}
      className="flex size-11 shrink-0 items-center justify-center rounded-md text-ink hover:bg-surface-muted"
    >
      <X aria-hidden className="size-6" />
    </button>
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
  onExit,
}: {
  mode: "control" | "field";
  crumbs?: Crumb[];
  /** 주면 우측 끝에 나가기(X)가 붙는다 — 현장모드에서 들어온 곁길 화면만 쓴다. */
  onExit?: () => void;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [user, setUser] = useState<CurrentUser>();
  const navigate = useNavigate();

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch((error: unknown) => {
        // 토큰이 없거나 만료됐다 — 계정 표시가 아니라 세션 자체가 없는 것이라 로그인으로 보낸다.
        if (error instanceof ApiError && error.status === 401) {
          navigate("/login", { replace: true });
        }
      });
  }, [navigate]);

  if (mode === "control") {
    return (
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-hairline bg-surface px-3">
        <HamburgerButton onClick={() => setDrawerOpen(true)} />
        {/* '/'는 로그인으로 리다이렉트되므로 관제 홈으로 직접 보낸다 */}
        <Link to="/control" className="flex shrink-0 items-center">
          <img
            src="/daullim-logo.png"
            alt="다울림"
            width={525}
            height={281}
            className="h-8 w-auto"
          />
        </Link>
        <Account className="text-body-sm" user={user} />
        {onExit && <ExitButton onClick={onExit} />}
        <AppDrawer mode="control" open={drawerOpen} onOpenChange={setDrawerOpen} user={user} />
      </header>
    );
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-hairline bg-surface px-3">
      <HamburgerButton onClick={() => setDrawerOpen(true)} />
      {crumbs && <Breadcrumb crumbs={crumbs} />}
      <Account className="text-body-md" user={user} />
      {onExit && <ExitButton onClick={onExit} />}
      <AppDrawer mode="field" open={drawerOpen} onOpenChange={setDrawerOpen} user={user} />
    </header>
  );
}
