import { Link } from "react-router-dom";
import { DataText } from "@/components/core/data-text";

/**
 * /field 3단계 드릴다운 공통 헤더 — 브레드크럼(상위 맥락) + "N단계/3" 진행 표시.
 * 농촌은 격자 단계(2/3)를 건너뛰어도 이 패턴을 그대로 쓴다 (표기: 2단계 생략).
 * 높이 48px 고정 (CLS 0).
 */
export interface Crumb {
  label: string;
  to?: string;
}

export function DrilldownHeader({
  crumbs,
  step,
  skippedGridStep,
  progress,
}: {
  crumbs: Crumb[];
  step: 1 | 2 | 3;
  /** 농촌 분기 — 격자 단계 생략 표시 */
  skippedGridStep?: boolean;
  /** 방문 진행도 예: "8/42" */
  progress?: string;
}) {
  return (
    <div className="flex h-12 shrink-0 items-center gap-3 overflow-hidden border-b border-hairline bg-surface px-4">
      <nav aria-label="드릴다운 경로" className="flex min-w-0 items-center gap-1.5">
        {crumbs.map((c, i) => (
          <span key={c.label} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && (
              <span aria-hidden className="text-subtle">
                ›
              </span>
            )}
            {c.to ? (
              <Link to={c.to} className="truncate text-body-sm text-brand">
                {c.label}
              </Link>
            ) : (
              <span className="truncate text-body-sm text-ink">{c.label}</span>
            )}
          </span>
        ))}
      </nav>
      <div className="ml-auto flex shrink-0 items-center gap-3">
        {progress && (
          <span className="text-caption text-subtle">
            진행 <DataText>{progress}</DataText>
          </span>
        )}
        <span className="rounded-sm bg-surface-muted px-2 py-1 text-caption text-body">
          <DataText>{step}</DataText>단계/<DataText>3</DataText>
          {skippedGridStep && " · 격자 단계 생략(농촌)"}
        </span>
      </div>
    </div>
  );
}
