import { useMemo, useState } from "react";
import { ControlPanel } from "@/components/layout/control-panel";
import { BarRow } from "@/components/core/bar-row";
import { DataText } from "@/components/core/data-text";
import { MonthCalendar } from "@/components/core/month-calendar";
import { RecordDetailDialog } from "@/components/records/record-detail-dialog";
import { RecordTable } from "@/components/records/record-table";
import { EmptyState, ErrorInline, RowSkeleton } from "@/components/core/system-states";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CONSENT_STATUS, type ConsentStatus } from "@/config/domain";
import { getVisitCalendar, getVisitSummary, getVisits } from "@/api/queries";
import { useApiQuery } from "@/api/use-api-query";
import { useControlScope } from "@/lib/use-control-scope";
import { todayDay } from "@/lib/units";
import type { VisitSummary } from "@/api/types";

interface Range {
  from: string;
  to: string;
}

/** YYYYMM 두 개를 포함 구간의 일자 경계로 편다 — 달 경계는 화면이 정한다(`/visits/summary` 규약). */
function spanOf(fromMonth: string, toMonth: string): Range {
  const y = Number(toMonth.slice(0, 4));
  const m = Number(toMonth.slice(4, 6));
  const lastDate = new Date(y, m, 0).getDate();
  return { from: `${fromMonth}01`, to: `${toMonth}${String(lastDate).padStart(2, "0")}` };
}

function monthKey(year: number, month: number): string {
  return `${year}${String(month).padStart(2, "0")}`;
}

/** 제목 앞 기간 — 한 달이면 "2026년 8월", 같은 해면 "2026년 6월~8월", 해를 넘으면 양쪽에 연도 */
function periodLabel(fromMonth: string, toMonth: string): string {
  const [fy, fm] = [fromMonth.slice(0, 4), Number(fromMonth.slice(4, 6))];
  const [ty, tm] = [toMonth.slice(0, 4), Number(toMonth.slice(4, 6))];
  if (fromMonth === toMonth) return `${fy}년 ${fm}월`;
  if (fy === ty) return `${fy}년 ${fm}월~${tm}월`;
  return `${fy}년 ${fm}월~${ty}년 ${tm}월`;
}

/** 포함 구간의 일수 — 일평균의 분모 */
function dayCount(range: Range): number {
  const parse = (d: string) =>
    new Date(Number(d.slice(0, 4)), Number(d.slice(4, 6)) - 1, Number(d.slice(6, 8)));
  return Math.max(1, Math.round((parse(range.to).getTime() - parse(range.from).getTime()) / 86_400_000) + 1);
}

/** 게이트 4종을 고정 순서로 편다 — 서버는 0건 코드를 담지 않으므로 0 채우기는 화면 몫이다. */
const CONSENT_ORDER = Object.keys(CONSENT_STATUS) as ConsentStatus[];

/** 일자별 표 — 점검원을 가리지 않으므로 '점검자' 열이 정보값이다 */
const DAY_COLUMNS = ["time", "officer", "address", "unit", "consent", "condition", "rxDone"] as const;

const YEAR_SPAN = 3;

/**
 * 관제 5. 실적 통계 — 시간 축.
 *
 * `/records`(드로어)가 **내 기록**이라면 이쪽은 **관할 안 모든 점검원**이다. 그래서 목록·달력에
 * `officerId`를 주지 않고 `sigunguCd`만 건다.
 */
export default function ControlReportPage() {
  const { sigunguCd, sigunguNm, sidoNm, summary: scopeSummary } = useControlScope();

  const thisMonth = todayDay().slice(0, 6);
  const [fromMonth, setFromMonth] = useState(thisMonth);
  const [toMonth, setToMonth] = useState(thisMonth);
  const range = useMemo(() => spanOf(fromMonth, toMonth), [fromMonth, toMonth]);

  const [month, setMonth] = useState(thisMonth);
  const [day, setDay] = useState<string>(todayDay);
  const [viewing, setViewing] = useState<number | null>(null);

  const summary = useApiQuery(
    `visit-summary:${sigunguCd ?? "all"}:${range.from}:${range.to}`,
    (signal) => getVisitSummary({ ...range, sigunguCd }, signal),
  );

  const monthSpan = spanOf(month, month);
  const calendar = useApiQuery(`visit-calendar:${sigunguCd ?? "all"}:${month}`, (signal) =>
    getVisitCalendar({ ...monthSpan, sigunguCd }, signal),
  );
  const markedDays = useMemo(
    () => new Set((calendar.data ?? []).filter((d) => d.count > 0).map((d) => d.day)),
    [calendar.data],
  );

  const daySummary = useApiQuery(`visit-summary-day:${sigunguCd ?? "all"}:${day}`, (signal) =>
    getVisitSummary({ from: day, to: day, sigunguCd }, signal),
  );
  const dayVisits = useApiQuery(`visits-day:${sigunguCd ?? "all"}:${day}`, (signal) =>
    getVisits({ from: day, to: day, sigunguCd, size: 100 }, signal),
  );

  const data = summary.data;
  const consentMax = Math.max(...CONSENT_ORDER.map((code) => data?.byConsent[code] ?? 0), 0);
  const regionTitle = sigunguNm ?? sidoNm ?? "전체 지역";
  const rows = dayVisits.data?.items ?? [];

  /* 역전을 만들지 않는다 — 시작을 끝 뒤로 밀면 끝이 따라오고, 반대도 같다 */
  const changeFrom = (next: string) => {
    setFromMonth(next);
    if (next > toMonth) setToMonth(next);
  };
  const changeTo = (next: string) => {
    setToMonth(next);
    if (next < fromMonth) setFromMonth(next);
  };

  return (
    <div className="space-y-3 p-5 pb-3">
      <header className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h1 className="text-display text-ink">{regionTitle}</h1>
        <span className="text-title-sm text-body">실적 통계</span>
      </header>

      {/* 기간 축 — 세 블록이 같은 기간을 말하므로 카드 하나 안에 둔다 */}
      <ControlPanel
        title={`${periodLabel(fromMonth, toMonth)} 기간 실적`}
        action={
          <span className="flex flex-wrap items-center gap-1">
            <MonthSelect value={fromMonth} onChange={changeFrom} label="시작" />
            <span aria-hidden className="px-1 text-body-md text-subtle">
              ~
            </span>
            <MonthSelect value={toMonth} onChange={changeTo} label="종료" />
          </span>
        }
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
                  <DataText>{scopeSummary.targetCount.toLocaleString()}</DataText> 세대 — 기간과 다른
                  축이다
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

/** 년·월 2단 — 기간 경계를 직접 고른다 */
function MonthSelect({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (next: string) => void;
  label: string;
}) {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const thisYear = Number(todayDay().slice(0, 4));
  const years = Array.from({ length: YEAR_SPAN }, (_, i) => thisYear - i);
  const trigger = "h-9 min-w-22 rounded-sm border-hairline-strong bg-surface data-[size=default]:h-9";

  return (
    <>
      <Select value={String(year)} onValueChange={(v) => onChange(monthKey(Number(v), month))}>
        <SelectTrigger aria-label={`${label} 연도 선택`} className={trigger}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}년
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={String(month)} onValueChange={(v) => onChange(monthKey(year, Number(v)))}>
        <SelectTrigger aria-label={`${label} 월 선택`} className={trigger}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <SelectItem key={m} value={String(m)}>
              {m}월
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
