import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

/** 모드 토글 — pill 허용 대상 (상태 태그·모드 토글 전용) */
function ModeToggle() {
  const { pathname } = useLocation();
  const isField = pathname.startsWith("/field");
  const seg = "flex h-8 items-center rounded-full px-3 text-caption";
  return (
    <nav
      aria-label="모드 전환"
      className="flex items-center gap-1 rounded-full bg-surface-muted p-1"
    >
      <Link
        to="/control"
        aria-current={!isField ? "page" : undefined}
        className={cn(seg, !isField ? "bg-surface text-ink shadow-e1" : "text-subtle")}
      >
        관제
      </Link>
      <Link
        to="/field"
        aria-current={isField ? "page" : undefined}
        className={cn(seg, isField ? "bg-surface text-ink shadow-e1" : "text-subtle")}
      >
        현장
      </Link>
    </nav>
  );
}

export function TopBar({ mode }: { mode: "control" | "field" }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-hairline bg-surface px-4">
      <Link to="/" className="text-title text-ink">
        다울림
      </Link>
      <span className="text-caption text-subtle">
        {mode === "control" ? "서울 관악소방서 예방과" : "🔒 관악소방서 · 점검 3팀"}
      </span>
      <div className="ml-auto flex items-center gap-3">
        <ModeToggle />
        <span className="text-body-sm text-body">이영선 주임</span>
      </div>
    </header>
  );
}
