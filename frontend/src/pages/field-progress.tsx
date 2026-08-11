import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { TopBar } from "@/components/layout/top-bar";
import { DataText } from "@/components/core/data-text";
import { ErrorInline, RowSkeleton } from "@/components/core/system-states";
import { useApiQuery } from "@/api/use-api-query";
import { useRegionNames } from "@/api/use-region";
import { getGridSummary, getVisitSummary } from "@/api/queries";
import { CONSENT_STATUS, type ConsentStatus } from "@/config/domain";
import { formatDay } from "@/lib/inspection";
import { todayDay } from "@/lib/units";
import { useFieldExit } from "@/lib/use-field-exit";
import type { GridSummary, VisitSummary } from "@/api/types";

/**
 * 현재 진행 상황 (현장 전용) — "지금 어디까지 왔나"에 답한다.
 *
 * 관제(어디를 갈 것인가)·기록 조회(무엇을 했었나)와 시간축이 다르다. 관제 드로어에는 이 메뉴가 뜨지
 * 않는다 — 팀 단위로 답할 데이터가 아직 없다(`visits`에 조직 축이 없다).
 *
 * 동·격자는 드로어가 URL로 넘겨준다(`?dongCd=&gridId=`) — 새로고침해도 화면이 복원된다.
 */
export default function FieldProgressPage() {
  const [params] = useSearchParams();
  const dongCd = params.get("dongCd") ?? undefined;
  const gridId = params.get("gridId") ?? undefined;
  const region = useRegionNames(dongCd);
  const exitToField = useFieldExit();

  const summary = useApiQuery(dongCd ? `gridSummary:${dongCd}` : null, (s) =>
    getGridSummary(dongCd!, s),
  );

  /* 오늘의 나 — officerId=me로 토큰 주인의 것만. 동을 안 골랐어도 뜬다(진행률과 달리 분모가 필요 없다) */
  const today = todayDay();
  const mine = useApiQuery(`visitSummary:${today}`, (s) =>
    getVisitSummary({ from: today, to: today, officerId: "me" }, s),
  );

  return (
    <div className="flex h-dvh flex-col bg-canvas">
      <TopBar
        mode="field"
        crumbs={[{ label: region.label ?? "현재 진행 상황" }]}
        onExit={exitToField}
      />

      <main className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="mx-auto flex max-w-240 flex-col gap-3">
          <TodayCard
            data={mine.data}
            loading={mine.loading}
            error={mine.error !== undefined}
            onRetry={mine.reload}
          />
          <DongProgressCard
            dongNm={region.dongNm}
            gridId={gridId}
            items={summary.data}
            loading={summary.loading}
            error={summary.error !== undefined}
            onRetry={summary.reload}
            hasDong={dongCd !== undefined}
          />
        </div>
      </main>
    </div>
  );
}

/** 카드 골격 — 관제 화면과 같은 rounded.md + hairline. */
function Card({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-md border border-hairline bg-surface">
      <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-hairline px-4">
        <h2 className="text-title text-ink">{title}</h2>
        {aside}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

/** 동 미선택 안내 — /field에서 바로 열면 진행률의 분모가 없다. */
function NeedsDong() {
  return (
    <p className="py-6 text-center text-body-md text-subtle">
      점검할 동을 먼저 고르면 진행률이 표시됩니다.
    </p>
  );
}

/**
 * ① 오늘의 나 — `GET /visits/summary`를 `from=to=오늘`로 부른다.
 *
 * 오늘의 경계는 KST 달력일이다(`visits.visited_day`와 같은 기준) — 그래서 서버가 오늘을
 * 정하지 않고 화면이 자기 달력일을 보낸다. 목록으로 세지 않는 이유는 커서로 잘려 오기 때문이다.
 */
function TodayCard({
  data,
  loading,
  error,
  onRetry,
}: {
  data?: VisitSummary;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const today = todayDay();
  return (
    <Card title="오늘" aside={<span className="text-body-md text-subtle">{formatDay(today)}</span>}>
      {loading && !data && <RowSkeleton density="field" rows={2} />}
      {error && <ErrorInline onRetry={onRetry} />}
      {!error && data && (
        <div className="space-y-4">
          <p className="flex items-baseline justify-between">
            <span className="text-body-md text-body">방문</span>
            <span className="text-title text-ink">
              <DataText>{data.total}</DataText>건
            </span>
          </p>

          {/* 서버는 0인 코드를 안 내린다 — 열거값 4종을 돌며 0으로 채운다(도메인 정본은 domain.ts) */}
          <ul className="grid grid-cols-2 gap-2">
            {(Object.keys(CONSENT_STATUS) as ConsentStatus[]).map((code) => (
              <li
                key={code}
                className="flex items-baseline justify-between rounded-md bg-surface-muted px-3 py-2"
              >
                <span className="text-caption text-subtle">{CONSENT_STATUS[code].label}</span>
                <span className="text-body-md text-ink">
                  <DataText>{data.byConsent[code] ?? 0}</DataText>
                </span>
              </li>
            ))}
          </ul>

          <p className="flex items-baseline justify-between border-t border-hairline pt-3">
            <span className="text-body-md text-body">교체</span>
            <span className="text-body-md text-ink">
              <DataText>{data.effectiveReplaceCount}</DataText>대
            </span>
          </p>
        </div>
      )}
    </Card>
  );
}

/** ② 공간 축 — 격자별 실시간 집계를 동 단위로 합친다(B2와 같은 출처). */
function DongProgressCard({
  dongNm,
  gridId,
  items,
  loading,
  error,
  onRetry,
  hasDong,
}: {
  dongNm?: string;
  gridId?: string;
  items?: GridSummary[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  hasDong: boolean;
}) {
  const total = useMemo(() => {
    const rows = items ?? [];
    return {
      target: rows.reduce((n, r) => n + r.targetCount, 0),
      visited: rows.reduce((n, r) => n + r.visitedCount, 0),
    };
  }, [items]);

  return (
    <Card title={dongNm ? `${dongNm} 진행률` : "동 진행률"}>
      {!hasDong ? (
        <NeedsDong />
      ) : error ? (
        <ErrorInline onRetry={onRetry} />
      ) : loading && !items ? (
        <RowSkeleton density="field" rows={2} />
      ) : (
        <>
          <ProgressBar visited={total.visited} target={total.target} />
          <ul className="mt-4 flex flex-col">
            {(items ?? []).map((row) => (
              <li
                key={row.gridId}
                className="flex h-11 items-center justify-between gap-3 border-b border-hairline last:border-b-0"
              >
                <span className="flex items-center gap-2 text-body-md text-body">
                  <DataText>{row.gridId}</DataText>
                  {/* 지금 보고 있는 격자를 표시해 둔다 — 목록에서 자기 위치를 잃지 않게 */}
                  {row.gridId === gridId && (
                    <span className="rounded-sm bg-brand-tint px-2 py-0.5 text-caption text-brand">
                      보는 중
                    </span>
                  )}
                </span>
                <span className="text-body-md text-ink">
                  <DataText>{row.visitedCount.toLocaleString()}</DataText>
                  <span className="text-subtle"> / {row.targetCount.toLocaleString()}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

/** 완료 세대 / 대상 세대. 색 단독으로 말하지 않고 수치를 병기한다(DESIGN.md). */
function ProgressBar({ visited, target }: { visited: number; target: number }) {
  const percent = target === 0 ? 0 : Math.round((visited / target) * 100);
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-body-md text-body">
          <DataText>{visited.toLocaleString()}</DataText> / {target.toLocaleString()} 세대
        </span>
        <span className="text-title text-ink">
          <DataText>{percent}</DataText>%
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="동 점검 진행률"
        className="h-3 w-full overflow-hidden rounded-full bg-surface-muted"
      >
        <div className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
