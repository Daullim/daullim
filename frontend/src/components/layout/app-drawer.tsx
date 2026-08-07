import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/core/button";
import { clearToken } from "@/api/token";
import type { CurrentUser } from "@/api/types";

/* to가 없는 항목은 라우트 미정 — 자리만 확보한 플레이스홀더 (라우트를 지어내지 않는다) */
const MENU_ITEMS: { label: string; to?: string }[] = [
  { label: "점검 기록 조회", to: "/records" },
  { label: "현재 진행 상황" },
  { label: "설정", to: "/settings" },
];

/**
 * 좌측 드로어 (/field·/control 공용) — focus trap·ESC·오버레이는 Radix Sheet에 위임.
 * 하단 고정 버튼: field = '현장점검 종료'(관제 복귀) / control = '로그아웃'(플레이스홀더).
 */
export function AppDrawer({
  mode,
  open,
  onOpenChange,
  user,
}: {
  mode: "control" | "field";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: CurrentUser;
}) {
  const navigate = useNavigate();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-80 gap-0 bg-surface p-0">
        <SheetHeader className="shrink-0 border-b border-hairline px-5 py-5 text-left">
          <SheetTitle className="text-title text-ink">
            {user?.name ?? "사용자"} {user?.titleName ?? ""}
          </SheetTitle>
          <SheetDescription className="text-body-md font-normal text-subtle">
            {user?.orgName ?? ""}
          </SheetDescription>
        </SheetHeader>

        <nav aria-label="메뉴" className="min-h-0 flex-1 overflow-y-auto py-2">
          {MENU_ITEMS.map(({ label, to }) => (
            <button
              key={label}
              type="button"
              disabled={!to}
              onClick={to ? () => navigate(to) : undefined}
              className="flex h-13 w-full items-center px-5 text-left text-title text-body hover:bg-surface-muted disabled:cursor-not-allowed disabled:text-subtle disabled:hover:bg-surface"
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="shrink-0 border-t border-hairline p-4">
          {mode === "field" ? (
            <Button
              variant="danger"
              size="field-xl"
              className="w-full"
              onClick={() => navigate("/control")}
            >
              ■ 현장점검 종료
            </Button>
          ) : (
            <Button
              variant="danger"
              size="field-xl"
              className="w-full"
              onClick={() => {
                clearToken();
                navigate("/login");
              }}
            >
              로그아웃
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
