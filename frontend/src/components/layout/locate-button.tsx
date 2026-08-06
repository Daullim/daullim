import { LocateFixed } from "lucide-react";
import type { LocateStatus } from "@/lib/use-current-position";
import { cn } from "@/lib/utils";

const LABEL: Record<LocateStatus, string> = {
  idle: "현재 위치",
  locating: "찾는 중…",
  ready: "현재 위치",
  denied: "위치 권한 꺼짐",
  failed: "현재 위치",
};

/**
 * 지도 하단 중앙 '현재 위치로 이동' 플로팅 버튼 (B2·B3).
 *
 * 권한이 거부되면 비활성으로 되돌린다 — 눌러도 아무 일이 없는 버튼을 남겨 두면 사용자는
 * 기기 설정 문제인지 앱 문제인지 알 수 없다. 사유는 `title`로 붙는다.
 */
export function LocateButton({
  status,
  message,
  onLocate,
}: {
  status: LocateStatus;
  message?: string;
  onLocate: () => void;
}) {
  const disabled = status === "locating" || status === "denied";

  return (
    <button
      type="button"
      aria-label="현재 위치로 이동"
      title={message}
      disabled={disabled}
      onClick={onLocate}
      className={cn(
        "absolute bottom-3 left-1/2 z-10 flex h-12 -translate-x-1/2 items-center gap-2 rounded-md border border-hairline bg-surface px-4 shadow-e1",
        disabled ? "cursor-not-allowed opacity-50" : "hover:bg-surface-muted",
      )}
    >
      <LocateFixed
        aria-hidden
        className={cn("size-5", status === "ready" ? "text-brand" : "text-body")}
      />
      <span className="text-body-md text-body">{LABEL[status]}</span>
    </button>
  );
}
