import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/core/button";
import { INSPECTOR } from "@/mock/sample";

/* 라우트 미정 — 자리만 확보한 플레이스홀더 메뉴 (라우트를 지어내지 않는다) */
const MENU_ITEMS = ["점검 기록 조회", "현재 진행 상황", "설정"];

/**
 * 좌측 드로어 (/field·/control 공용) — focus trap·ESC·오버레이는 Radix Sheet에 위임.
 * 하단 고정 버튼: field = '현장점검 종료'(관제 복귀) / control = '로그아웃'(플레이스홀더).
 */
export function AppDrawer({
  mode,
  open,
  onOpenChange,
}: {
  mode: "control" | "field";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-80 gap-0 bg-surface p-0">
        <SheetHeader className="shrink-0 border-b border-hairline px-5 py-5 text-left">
          <SheetTitle className="text-title text-ink">
            {INSPECTOR.name} {INSPECTOR.title}
          </SheetTitle>
          <SheetDescription className="text-body-md font-normal text-subtle">
            {INSPECTOR.org}
          </SheetDescription>
        </SheetHeader>

        <nav aria-label="메뉴" className="min-h-0 flex-1 overflow-y-auto py-2">
          {MENU_ITEMS.map((label) => (
            <button
              key={label}
              type="button"
              className="flex h-13 w-full items-center px-5 text-left text-title text-body hover:bg-surface-muted"
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
            /* 로그인(/login) 미구현 — 연결 전까지 드로어 닫기만 한다 */
            <Button
              variant="danger"
              size="field-xl"
              className="w-full"
              onClick={() => onOpenChange(false)}
            >
              로그아웃
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
