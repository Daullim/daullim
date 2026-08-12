import { useMemo, useState } from "react";
import { ControlPanel } from "@/components/layout/control-panel";
import { BarRow } from "@/components/core/bar-row";
import { DataText } from "@/components/core/data-text";
import { EmptyState, ErrorInline, RowSkeleton } from "@/components/core/system-states";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CONDITION_CODE,
  REFUSAL_REASON,
  type ConditionCode,
  type RefusalReason,
} from "@/config/domain";
import { getDongs, getVisitBreakdown } from "@/api/queries";
import { useApiQuery } from "@/api/use-api-query";
import { useControlScope } from "@/lib/use-control-scope";
import { PeriodSelect } from "@/components/layout/period-select";
import { spanOf, thisMonthRange } from "@/lib/period-range";
import type { CodeCount, Dong } from "@/api/types";

/** 판정은 나쁜 쪽부터 — 이 표를 보는 이유가 불량을 찾는 것이다 */
const CONDITION_ORDER: ConditionCode[] = ["DEFECTIVE", "EXPIRED", "REPLACE_ADVISED", "OK_GOOD"];
const REFUSAL_ORDER = Object.keys(REFUSAL_REASON) as RefusalReason[];

interface ProgressTotals {
  household: number;
  done: number;
  unvisited: number;
  replacementUsed: number;
}

/** 서버는 0건 코드를 담지 않는다 — 열거값을 돌며 0으로 채우는 것은 화면 몫이다 */
function countOf<T extends string>(rows: CodeCount<T>[] | undefined, code: T): number {
  return rows?.find((r) => r.code === code)?.count ?? 0;
}

function rate(d: Dong): number {
  return d.householdCount === 0 ? 1 : d.doneUnitCount / d.householdCount;
}

/** 관제 3. 추진 현황 — 공간 축. "어느 동이 얼마나 남았나"에 답한다. */
export default function ControlProgressPage() {
  const { sidoCd, sigunguCd, sigunguNm, sidoNm } = useControlScope();
  const [period, setPeriod] = useState(thisMonthRange);
  const range = useMemo(() => spanOf(period), [period]);

  const scope = { sidoCd: sigunguCd ? undefined : sidoCd, sigunguCd };
  const scopeKey = sigunguCd ?? sidoCd ?? "all";

  const dongs = useApiQuery(sigunguCd ? `dongs:${sigunguCd}` : null, (s) => getDongs(sigunguCd!, s));
  const breakdown = useApiQuery(`visit-breakdown:${scopeKey}:${range.from}:${range.to}`, (signal) =>
    getVisitBreakdown({ ...range, ...scope }, signal),
  );

  /* 덜 된 동이 위로 — 이 표는 "어디부터 손대나"를 답한다 */
  const rows = useMemo(
    () => [...(dongs.data ?? [])].sort((a, b) => rate(a) - rate(b)),
    [dongs.data],
  );
  const totals = useMemo(
    () =>
      (dongs.data ?? []).reduce<ProgressTotals>(
        (sum, d) => ({
          household: sum.household + d.householdCount,
          done: sum.done + d.doneUnitCount,
          unvisited: sum.unvisited + d.pendingUnitCount,
          replacementUsed: sum.replacementUsed + d.replacementUsedCount,
        }),
        { household: 0, done: 0, unvisited: 0, replacementUsed: 0 },
      ),
    [dongs.data],
  );

  const result = breakdown.data?.period;
  const conditionMax = Math.max(
    ...CONDITION_ORDER.map((c) => countOf(result?.byConditionCode, c)),
    0,
  );
  const refusalMax = Math.max(...REFUSAL_ORDER.map((c) => countOf(result?.byRefusalReason, c)), 0);
  const regionTitle = sigunguNm ?? sidoNm ?? "전체 지역";

  return (
    <div className="space-y-3 p-5 pb-3">
      <header className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h1 className="text-display text-ink">{regionTitle}</h1>
        <span className="text-title-sm text-body">추진 현황</span>
      </header>

      <ControlPanel title="구의 진행률·미방문 세대">
        {dongs.error ? (
          <ErrorInline onRetry={dongs.reload} />
        ) : dongs.loading && !dongs.data ? (
          <RowSkeleton rows={1} />
        ) : rows.length === 0 ? (
          <EmptyState
            message={sigunguCd ? "이 관할의 산출 결과가 없습니다" : "시·군·구를 선택하세요"}
            onAction={dongs.reload}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(16rem,1.4fr)_repeat(4,minmax(8rem,1fr))]">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-body-sm text-body">{sigunguNm ?? "선택 관할"}</span>
                <DataText className="text-title-sm text-ink">
                  {percentOf(totals.done, totals.household)}%
                </DataText>
              </div>
              <ProgressMeter done={totals.done} total={totals.household} />
            </div>
            <SummaryFigure label="대상 세대" value={totals.household} />
            <SummaryFigure label="방문 세대" value={totals.done} />
            <SummaryFigure label="미방문 세대" value={totals.unvisited} />
            <SummaryFigure label="교체 개수" value={totals.replacementUsed} unit="대" />
          </div>
        )}
      </ControlPanel>

      <ControlPanel title="기간 내 결과" action={<PeriodSelect value={period} onChange={setPeriod} />}>
        {breakdown.error ? (
          <ErrorInline onRetry={breakdown.reload} />
        ) : breakdown.loading && !breakdown.data ? (
          <RowSkeleton rows={4} />
        ) : (
          <div className="grid gap-6 xl:grid-cols-2">
            <section>
              <h3 className="mb-3 text-title-sm text-ink">판정 분포</h3>
              <div className="space-y-3">
                {CONDITION_ORDER.map((code) => (
                  <BarRow
                    key={code}
                    label={CONDITION_CODE[code].label}
                    value={countOf(result?.byConditionCode, code)}
                    max={conditionMax}
                    valueLabel={`${countOf(result?.byConditionCode, code).toLocaleString()}세대`}
                  />
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-title-sm text-ink">방문 거부 사유</h3>
              <div className="space-y-3">
                {REFUSAL_ORDER.map((code) => (
                  <BarRow
                    key={code}
                    label={REFUSAL_REASON[code].label}
                    value={countOf(result?.byRefusalReason, code)}
                    max={refusalMax}
                    valueLabel={`${countOf(result?.byRefusalReason, code).toLocaleString()}건`}
                  />
                ))}
              </div>
            </section>
          </div>
        )}
      </ControlPanel>

      <ControlPanel title="동별 진행률·미방문 세대">
        {dongs.error ? (
          <ErrorInline onRetry={dongs.reload} />
        ) : dongs.loading && !dongs.data ? (
          <RowSkeleton rows={6} />
        ) : rows.length === 0 ? (
          <EmptyState
            message={sigunguCd ? "이 관할의 산출 결과가 없습니다" : "시·군·구를 선택하세요"}
            onAction={dongs.reload}
          />
        ) : (
          <div className="max-h-160 overflow-y-auto">
            <Table className="[&_td]:px-4 [&_th]:px-4">
              <TableHeader className="sticky top-0 z-10 bg-surface">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-full text-body-md font-semibold text-ink">동</TableHead>
                  <TableHead className="text-right text-body-md font-semibold text-ink">
                    대상 세대
                  </TableHead>
                  <TableHead className="text-right text-body-md font-semibold text-ink">
                    방문 세대
                  </TableHead>
                  <TableHead className="text-right text-body-md font-semibold text-ink">
                    미방문 세대
                  </TableHead>
                  <TableHead className="text-right text-body-md font-semibold text-ink">
                    교체 개수
                  </TableHead>
                  <TableHead className="text-right text-body-md font-semibold text-ink">
                    재방문 대기
                  </TableHead>
                  <TableHead className="text-right text-body-md font-semibold text-ink">
                    진행
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((d) => (
                  <TableRow key={d.dongCd} className="h-12 hover:bg-transparent">
                    <TableCell className="max-w-0 truncate text-body-md text-ink">
                      {d.dongNm}
                    </TableCell>
                    <TableCell className="text-right text-body-md text-body">
                      <DataText>{d.householdCount.toLocaleString()}</DataText>
                    </TableCell>
                    <TableCell className="text-right text-body-md text-body">
                      <DataText>{d.doneUnitCount.toLocaleString()}</DataText>
                    </TableCell>
                    <TableCell className="text-right text-body-md text-body">
                      <DataText>{d.pendingUnitCount.toLocaleString()}</DataText>
                    </TableCell>
                    <TableCell className="text-right text-body-md text-body">
                      <DataText>{d.replacementUsedCount.toLocaleString()}</DataText>대
                    </TableCell>
                    <TableCell className="text-right text-body-md text-body">
                      <DataText>{d.revisitPendingUnitCount.toLocaleString()}</DataText>
                    </TableCell>
                    <TableCell className="text-right text-body-md text-body">
                      <ProgressCell done={d.doneUnitCount} total={d.householdCount} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </ControlPanel>
    </div>
  );
}

function percentOf(done: number, total: number): number {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

function SummaryFigure({ label, value, unit }: { label: string; value: number; unit?: string }) {
  return (
    <div className="border-t border-hairline pt-3 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-4">
      <p className="text-caption text-subtle">{label}</p>
      <p className="text-ink">
        <DataText className="text-data-lg">{value.toLocaleString()}</DataText>
        {unit && <span className="ml-1 text-body-sm text-body">{unit}</span>}
      </p>
    </div>
  );
}

function ProgressMeter({ done, total }: { done: number; total: number }) {
  return (
    <span aria-hidden className="block h-3 overflow-hidden rounded-xs bg-surface-muted">
      <span className="block h-full bg-brand" style={{ width: `${percentOf(done, total)}%` }} />
    </span>
  );
}

/** 진행 셀의 인라인 막대 — 값은 옆 수치가 말하고 막대는 훑어보기용이다. */
function ProgressCell({ done, total }: { done: number; total: number }) {
  const percent = percentOf(done, total);
  return (
    <span className="flex items-center justify-end gap-2">
      <span aria-hidden className="h-2 w-16 overflow-hidden rounded-xs bg-surface-muted">
        <span className="block h-full bg-brand" style={{ width: `${percent}%` }} />
      </span>
      <DataText className="w-10 text-right">{percent}%</DataText>
    </span>
  );
}
