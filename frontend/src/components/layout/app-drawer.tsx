import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/core/button";
import { clearToken } from "@/api/token";
import { displayName } from "@/lib/user";
import type { CurrentUser } from "@/api/types";

/* to가 없는 항목은 라우트 미정 — 자리만 확보한 플레이스홀더 (라우트를 지어내지 않는다) */
const MENU_ITEMS: {
  label: string;
  to?: string;
  /** 현장 드로어에만 보인다 — 관제에는 팀 단위로 답할 데이터가 없다 */
  fieldOnly?: boolean;
  /** 지금 보고 있는 동·격자를 함께 넘긴다 */
  carriesRegion?: boolean;
}[] = [
  { label: "점검 기록 조회", to: "/records" },
  { label: "현재 진행 상황", to: "/field/progress", fieldOnly: true, carriesRegion: true },
  { label: "설정", to: "/settings" },
];

/**
 * 현장모드에서 들어왔음을 곁길 화면에 알린다 — 그 화면이 나가기(X)를 띄우는 조건이다.
 *
 * location.state가 아니라 쿼리로 두는 이유는 새로고침이다. 현장 태블릿은 화면을 종일 켜 두고
 * 새로고침이 잦은데(api/token.ts와 같은 이유), state는 그때 사라져 X가 증발한다.
 */
const FIELD_ENTRY = "from=field";

/** 현장 메뉴의 이동 경로 — 나가기(X) 표식과, 요청 시 지금 보고 있는 동·격자를 함께 싣는다. */
function fieldTarget(to: string, carriesRegion: boolean, current: URLSearchParams): string {
  const next = new URLSearchParams(FIELD_ENTRY);
  if (carriesRegion) {
    for (const key of ["dongCd", "gridId"]) {
      const value = current.get(key);
      if (value) next.set(key, value);
    }
  }
  return `${to}?${next}`;
}

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
  const [params] = useSearchParams();
  const menu = MENU_ITEMS.filter((item) => mode === "field" || !item.fieldOnly);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-80 gap-0 bg-surface p-0">
        <SheetHeader className="shrink-0 border-b border-hairline px-5 py-5 text-left">
          <SheetTitle className="text-title text-ink">{displayName(user)}</SheetTitle>
          <SheetDescription className="text-body-md font-normal text-subtle">
            {user?.orgName ?? ""}
          </SheetDescription>
        </SheetHeader>

        <nav aria-label="메뉴" className="min-h-0 flex-1 overflow-y-auto py-2">
          {menu.map(({ label, to, carriesRegion }) => (
            <button
              key={label}
              type="button"
              disabled={!to}
              onClick={
                to
                  ? () =>
                      navigate(
                        mode === "field" ? fieldTarget(to, carriesRegion === true, params) : to,
                      )
                  : undefined
              }
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
