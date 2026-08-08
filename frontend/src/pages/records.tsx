import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { TopBar } from "@/components/layout/top-bar";
import { DataText } from "@/components/core/data-text";
import { MonthCalendar } from "@/components/core/month-calendar";
import { RecordDetailDialog } from "@/components/records/record-detail-dialog";
import { RecordTable } from "@/components/records/record-table";
import { EmptyState, ErrorInline, RowSkeleton } from "@/components/core/system-states";
import { formatDay } from "@/lib/inspection";
import { todayDay } from "@/lib/units";
import { useFieldExit } from "@/lib/use-field-exit";
import { getVisitCalendar, getVisits } from "@/api/queries";
import { useApiQuery } from "@/api/use-api-query";

/** 월의 마지막 날 — 달력 집계 범위의 끝. 다음 달 0일이 이번 달 말일이다. */
function monthRange(month: string): { from: string; to: string } {
  const year = Number(month.slice(0, 4));
  const mm = Number(month.slice(4, 6));
  const lastDay = new Date(year, mm, 0).getDate();
  return { from: `${month}01`, to: `${month}${String(lastDay).padStart(2, "0")}` };
}

/** 날짜는 패널 헤더에 있어 컬럼에서 뺀다 */
const LIST_COLUMNS = ["time", "address", "unit", "consent", "condition", "rxDone"] as const;

/** 점검 기록 조회 — 좌 캘린더로 날짜를 고르고 우 표에서 그 날의 기록을 본다 */
export default function RecordsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  /**
   * 진입 기본값은 오늘 — 점검원이 가장 자주 보는 것이 오늘 돈 결과다.
   *
   * 모듈 로드가 아니라 마운트 때 읽는다. 현장 태블릿은 화면을 종일 켜 두므로 자정을 넘기면
   * 모듈 상수는 어제에 굳는다.
   */
  const [month, setMonth] = useState(() => todayDay().slice(0, 6));
  const [selectedDay, setSelectedDay] = useState<string | null>(todayDay);
  const [viewing, setViewing] = useState<number | null>(null);
  const exitToField = useFieldExit();

  /* 달력 점 표식·월 총건수 — 목록은 커서로 잘려 오므로 집계를 따로 받는다 */
  const range = monthRange(month);
  const calendar = useApiQuery(`visitCalendar:${month}`, (s) =>
    getVisitCalendar({ from: range.from, to: range.to }, s),
  );
  const markedDays = useMemo(
    () => new Set((calendar.data ?? []).filter((d) => d.count > 0).map((d) => d.day)),
    [calendar.data],
  );
  const monthCount = (calendar.data ?? []).reduce((n, d) => n + d.count, 0);

  const visits = useApiQuery(selectedDay ? `visits:${selectedDay}` : null, (s) =>
    getVisits({ from: selectedDay!, to: selectedDay!, size: 100 }, s),
  );
  const rows = visits.data?.items ?? [];

  return (
    <div className="flex h-dvh flex-col">
      <TopBar mode="control" onExit={exitToField} />

      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-hairline bg-surface px-4 py-2">
        <button
          type="button"
          aria-label="뒤로 가기"
          /* react-router는 최초 진입 항목의 key를 "default"로 준다 — 돌아갈 히스토리가 없다는 뜻 */
          onClick={() => (location.key === "default" ? navigate("/control") : navigate(-1))}
          className="flex size-10 shrink-0 items-center justify-center rounded-md text-ink hover:bg-surface-muted"
        >
          <ArrowLeft aria-hidden className="size-5" />
        </button>
        <h1 className="text-title text-ink">점검 기록</h1>
        <span className="ml-auto text-body-md text-ink">
          {month.slice(0, 4)}.{month.slice(4, 6)} 총{" "}
          <DataText>{monthCount}</DataText>건
        </span>
      </div>

      <main className="flex min-h-0 flex-1 gap-3 p-3">
        {/* 좌 — 캘린더. 날짜를 바꿔도 폭이 고정이라 시선이 흔들리지 않는다 */}
        <aside className="flex w-90 shrink-0 flex-col overflow-hidden rounded-md border border-hairline bg-surface">
          <div className="flex h-12 shrink-0 items-center border-b border-hairline px-3">
            <h2 className="text-title-sm text-ink">날짜 선택</h2>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <MonthCalendar
              month={month}
              selectedDay={selectedDay}
              markedDays={markedDays}
              onMonthChange={setMonth}
              onSelectDay={setSelectedDay}
            />
          </div>
        </aside>

        {/* 우 — 선택한 날짜의 기록 표 */}
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-hairline bg-surface">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-hairline px-3">
            <h2 className="text-title-sm text-ink">
              {selectedDay ? formatDay(selectedDay) : "날짜를 선택하세요"}
            </h2>
            <span className="text-caption text-subtle">
              <DataText>{rows.length}</DataText>건
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {visits.error ? (
              <ErrorInline onRetry={visits.reload} className="m-3" />
            ) : visits.loading && !visits.data ? (
              <RowSkeleton rows={5} />
            ) : rows.length === 0 ? (
              <EmptyState message="점검 기록 없음" onAction={visits.reload} />
            ) : (
              <RecordTable
                records={rows}
                columns={LIST_COLUMNS}
                onSelect={(r) => setViewing(r.visitId)}
              />
            )}
          </div>
        </section>
      </main>

      <RecordDetailDialog
        visitId={viewing}
        open={viewing !== null}
        onClose={() => setViewing(null)}
      />
    </div>
  );
}
