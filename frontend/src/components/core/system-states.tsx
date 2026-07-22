import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/core/button";
import { DataText } from "@/components/core/data-text";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
 * 시스템 상태 공통 패러다임 (DESIGN.md System States)
 * Loading / Empty / Error / Offline — 화면별 즉흥 처리 금지, 이 한 벌만 사용.
 * ------------------------------------------------------------------------- */

/** Loading(폴링) — 자리 유지형. 이전 데이터 옆에 타임스탬프만 갱신한다. */
export function LastUpdated({
  seconds,
  className,
}: {
  seconds: number;
  className?: string;
}) {
  return (
    <span className={cn("text-caption font-normal text-subtle", className)}>
      마지막 갱신: <DataText>{seconds}</DataText>초 전
    </span>
  );
}

/** Loading(첫 로드) — 행 높이는 실데이터와 동일하게 고정 (CLS 0). */
export function RowSkeleton({
  density = "control",
  rows = 3,
}: {
  density?: "control" | "field";
  rows?: number;
}) {
  return (
    <div aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center gap-3 border-b border-hairline px-3",
            density === "control" ? "h-12" : "h-16",
          )}
        >
          <Skeleton className="h-4 w-6" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Empty — 아이콘 없음, 본문색 안내 + 다음 행동 1개. */
export function EmptyState({
  message = "이 관할·분기의 산출 결과가 없습니다",
  actionLabel = "다시 불러오기",
  onAction,
  className,
}: {
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-4 py-10 text-center", className)}>
      <p className="text-body-md font-normal text-body">{message}</p>
      <Button variant="secondary" onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  );
}

/** Error — 화면 전환 없는 인라인 바 + 재시도. 기술 용어 노출 금지. */
export function ErrorInline({
  onRetry,
  className,
}: {
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-center gap-3 rounded-sm border-l-4 border-l-risk-danger bg-risk-danger-tint px-3 py-2",
        className,
      )}
    >
      <p className="flex-1 text-body-sm text-risk-danger">
        불러오지 못했습니다. 네트워크 확인 후 다시 시도해 주세요.
      </p>
      <Button variant="secondary" onClick={onRetry}>
        다시 시도
      </Button>
    </div>
  );
}

/** Offline — 상단 고정 안내 바. 폼 저장 실패도 이 플로우로 수렴 (PRD). */
export function OfflineBar({ className }: { className?: string }) {
  return (
    <div
      role="status"
      className={cn(
        "border-l-4 border-l-offline bg-offline-bg px-3 py-2 text-body-sm text-risk-warn",
        className,
      )}
    >
      오프라인 — 점검 결과는 기기에 저장되고, 연결되면 자동 전송됩니다.
    </div>
  );
}
