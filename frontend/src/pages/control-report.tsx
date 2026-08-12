import { useMemo, useState } from "react";
import { ControlPanel } from "@/components/layout/control-panel";
import { PeriodSelect } from "@/components/layout/period-select";
import { BarRow } from "@/components/core/bar-row";
import { DataText } from "@/components/core/data-text";
import { MonthCalendar } from "@/components/core/month-calendar";
import { RecordDetailDialog } from "@/components/records/record-detail-dialog";
import { RecordTable } from "@/components/records/record-table";
import { EmptyState, ErrorInline, RowSkeleton } from "@/components/core/system-states";
import { CONSENT_STATUS, type ConsentStatus } from "@/config/domain";
import { getVisitCalendar, getVisitSummary, getVisits } from "@/api/queries";
import { useApiQuery } from "@/api/use-api-query";
import { useControlScope } from "@/lib/use-control-scope";
import { dayCount, periodLabel, spanOf, thisMonthRange } from "@/lib/period-range";
import { todayDay } from "@/lib/units";
import type { VisitSummary } from "@/api/types";

/** 게이트 4종을 고정 순서로 편다 — 서버는 0건 코드를 담지 않으므로 0 채우기는 화면 몫이다. */
const CONSENT_ORDER = Object.keys(CONSENT_STATUS) as ConsentStatus[];

/** 일자별 표 — 점검원을 가리지 않으므로 '점검자' 열이 정보값이다 */
const DAY_COLUMNS = ["time", "officer", "address", "unit", "consent", "condition", "rxDone"] as const;

/**
 * 관제 5. 실적 통계 — 시간 축.
 *
 * `/records`(드로어)가 **내 기록**이라면 이쪽은 **관할 안 모든 점검원**이다. 그래서 목록·달력에
 * `officerId`를 주지 않고 관할 스코프만 건다.
 */
export default function ControlReportPage() {
  const { sidoCd, sigunguCd, sigunguNm, sidoNm, summary: scopeSummary } = useControlScope();
  /* 전체지역이면 시군구가 비고 시도만 남는다 — 안 넘기면 전국이 합산된다 */
  const scope = { sidoCd: sigunguCd ? undefined : sidoCd, sigunguCd };
  const scopeKey = sigunguCd ?? sidoCd ?? "all";

  const [period, setPeriod] = useState(thisMonthRange);
  const range = useMemo(() => spanOf(period), [period]);

  const [month, setMonth] = useState(() => todayDay().slice(0, 6));
  const [day, setDay] = useState<string>(todayDay);
  const [viewing, setViewing] = useState<number | null>(null);

  const summary = useApiQuery(`visit-summary:${scopeKey}:${range.from}:${range.to}`, (signal) =>
    getVisitSummary({ ...range, ...scope }, signal),
  );

  const monthSpan = spanOf({ fromMonth: month, toMonth: month });
  const calendar = useApiQuery(`visit-calendar:${scopeKey}:${month}`, (signal) =>
    getVisitCalendar({ ...monthSpan, ...scope }, signal),
  );
  const markedDays = useMemo(
    () => new Set((calendar.data ?? []).filter((d) => d.count > 0).map((d) => d.day)),
    [calendar.data],
  );

  const daySummary = useApiQuery(`visit-summary-day:${scopeKey}:${day}`, (signal) =>
    getVisitSummary({ from: day, to: day, ...scope }, signal),
  );
  const dayVisits = useApiQuery(`visits-day:${scopeKey}:${day}`, (signal) =>
    getVisits({ from: day, to: day, ...scope, size: 100 }, signal),
  );

  const data = summary.data;
  const consentMax = Math.max(...CONSENT_ORDER.map((code) => data?.byConsent[code] ?? 0), 0);
  const regionTitle = sigunguNm ?? sidoNm ?? "전체 지역";
  const rows = dayVisits.data?.items ?? [];

  return (
    <div className="space-y-3 p-5 pb-3">
      <header className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h1 className="text-display text-ink">{regionTitle}</h1>
        <span className="text-title-sm text-body">실적 통계</span>
      </header>

      {/* 기간 축 — 세 블록이 같은 기간을 말하므로 카드 하나 안에 둔다 */}
      <ControlPanel
        title={`${periodLabel(period)} 기간 실적`}
        action={<PeriodSelect value={period} onChange={setPeriod} />}
      >
        {summary.error ? (
          <ErrorInline onRetry={summary.reload} />
        ) : summary.loading && !data ? (
          <RowSkeleton rows={4} />
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Figure label="점검 세대" value={data?.total ?? 0} unit="건" />
              {/* 서버가 다시 계산한 실효 개수다 — 현장 원입력이 아니다 */}
              <Figure
                label="교체 대수"
                value={data?.effectiveReplaceCount ?? 0}
                unit="대"
                note="서버 판정 기준"
              />
              <Figure label="미승낙" value={notAccepted(data)} unit="건" note="거부·공가·연락두절" />
            </div>

            <section className="border-t border-hairline pt-5">
              <h3 className="mb-3 text-title-sm text-ink">방문 결과 내역</h3>
              <div className="space-y-3">
                {CONSENT_ORDER.map((code) => (
                  <BarRow
                    key={code}
                    label={CONSENT_STATUS[code].label}
                    value={data?.byConsent[code] ?? 0}
                    max={consentMax}
                    valueLabel={`${(data?.byConsent[code] ?? 0).toLocaleString()}건`}
                  />
                ))}
              </div>
            </section>

            {/* 총량만으로는 안 보이는 것 — 성사율·처리 속도·자재 원단위 */}
            <section className="border-t border-hairline pt-5">
              <h3 className="mb-3 text-title-sm text-ink">운영 지표</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <Metric
                  label="승낙률"
                  value={ratio(data?.byConsent.accepted ?? 0, data?.total ?? 0)}
                  note={`${(data?.byConsent.accepted ?? 0).toLocaleString()} / ${(data?.total ?? 0).toLocaleString()}건`}
                />
                <Metric
                  label="일평균 점검"
                  value={`${round1((data?.total ?? 0) / dayCount(range))}건`}
                  note={`${dayCount(range)}일 기준`}
                />
                <Metric
                  label="세대당 교체"
                  value={`${round1(
                    (data?.effectiveReplaceCount ?? 0) / Math.max(1, data?.byConsent.accepted ?? 0),
                  )}대`}
                  note="승낙 세대 기준 · 자재 원단위"
                />
              </div>
              {scopeSummary && (
                <p className="mt-3 text-caption text-subtle">
                  관할 누적 <DataText>{scopeSummary.doneCount.toLocaleString()}</DataText> /{" "}
                  <DataText>{scopeSummary.targetCount.toLocaleString()}</DataText> 세대
                </p>
              )}
            </section>
          </div>
        )}
      </ControlPanel>

      {/* 일자 축 — 관할 안 모든 점검원의 그날 기록 */}
      <ControlPanel title="일자별 기록">
        <div className="flex flex-col gap-3 lg:flex-row lg:gap-8">
          {/* 좌 달력 — /records와 같은 조작이되 점은 관할 전체 기준으로 찍힌다 */}
          <aside className="shrink-0 overflow-hidden rounded-md border border-hairline lg:w-90">
            <MonthCalendar
              month={month}
              selectedDay={day}
              markedDays={markedDays}
              onMonthChange={setMonth}
              onSelectDay={setDay}
            />
          </aside>

          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <DayFigures summary={daySummary.data} loading={daySummary.loading} />

            <div className="max-h-140 min-h-40 overflow-y-auto rounded-md border border-hairline">
              {dayVisits.error ? (
                <ErrorInline onRetry={dayVisits.reload} className="m-3" />
              ) : dayVisits.loading && !dayVisits.data ? (
                <RowSkeleton rows={5} />
              ) : rows.length === 0 ? (
                <EmptyState message="점검 기록 없음" onAction={dayVisits.reload} />
              ) : (
                <RecordTable
                  records={rows}
                  columns={DAY_COLUMNS}
                  onSelect={(r) => setViewing(r.visitId)}
                />
              )}
            </div>
          </div>
        </div>
      </ControlPanel>

      <RecordDetailDialog visitId={viewing} open={viewing !== null} onClose={() => setViewing(null)} />
    </div>
  );
}

function notAccepted(summary: VisitSummary | undefined): number {
  return CONSENT_ORDER.filter((code) => code !== "accepted").reduce(
    (sum, code) => sum + (summary?.byConsent[code] ?? 0),
    0,
  );
}

function ratio(part: number, whole: number): string {
  return whole === 0 ? "—" : `${Math.round((part / whole) * 100)}%`;
}

function round1(value: number): string {
  return Number.isFinite(value) ? value.toFixed(1) : "0.0";
}

/** 보고에 올라가는 수치 — 이 화면에서 가장 큰 글자다 */
function Figure({
  label,
  value,
  unit,
  note,
}: {
  label: string;
  value: number;
  unit: string;
  note?: string;
}) {
  return (
    <div>
      <p className="text-caption text-subtle">{label}</p>
      <p className="text-ink">
        <DataText className="text-data-lg">{value.toLocaleString()}</DataText>
        <span className="ml-1 text-body-sm text-body">{unit}</span>
      </p>
      {note && <p className="text-caption text-subtle">{note}</p>}
    </div>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div>
      <p className="text-body-sm text-body">{label}</p>
      <DataText className="text-title text-ink">{value}</DataText>
      <p className="text-caption text-subtle">{note}</p>
    </div>
  );
}

function DayFigures({ summary, loading }: { summary?: VisitSummary; loading: boolean }) {
  if (loading && !summary) return <RowSkeleton rows={1} />;
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Metric
        label="점검 건수"
        value={`${(summary?.total ?? 0).toLocaleString()}건`}
        note="관할 전체 점검자"
      />
      <Metric
        label="교체 대수"
        value={`${(summary?.effectiveReplaceCount ?? 0).toLocaleString()}대`}
        note="서버 판정 기준"
      />
      <Metric
        label="승낙"
        value={`${(summary?.byConsent.accepted ?? 0).toLocaleString()}건`}
        note={`미승낙 ${notAccepted(summary)}건`}
      />
    </div>
  );
}
