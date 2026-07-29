import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { CONSENT_STATUS, RX_DONE } from "@/config/domain";
import { TopBar } from "@/components/layout/top-bar";
import { DataText } from "@/components/core/data-text";
import { MonthCalendar } from "@/components/core/month-calendar";
import { ConditionBadge } from "@/components/inspection/form-controls";
import { RecordDetailDialog } from "@/components/records/record-detail-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatDay,
  isAgeEstimated,
  judgeAlarms,
  type InspectionFormState,
} from "@/lib/inspection";
import {
  RECORD_DAYS,
  recordCountOfMonth,
  recordsOf,
  type InspectionRecord,
} from "@/mock/records";

const DEFAULT_MONTH = "202607";
const DEFAULT_DAY = "20260715";

/** 판정 셀 — 비승낙은 경보기를 물리적으로 못 봐서 판정 자체가 없다 */
function JudgementCell({ form }: { form: InspectionFormState }) {
  const code = judgeAlarms(form);
  if (!code) return <span className="text-subtle">—</span>;
  return <ConditionBadge code={code} estimated={code === "EXPIRED" && isAgeEstimated(form)} />;
}

/** 현장 교체 완료 여부 — 비승낙 방문은 교체 자체가 발생하지 않는다 */
function RxDoneCell({ form }: { form: InspectionFormState }) {
  if (!form.rxDone) return <span className="text-subtle">—</span>;
  return <span className="text-body-md text-ink">{RX_DONE[form.rxDone].label}</span>;
}

/** 점검 기록 조회 — 좌 캘린더로 날짜를 고르고 우 표에서 그 날의 기록을 본다 */
export default function RecordsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [month, setMonth] = useState(DEFAULT_MONTH);
  const [selectedDay, setSelectedDay] = useState<string | null>(DEFAULT_DAY);
  const [viewing, setViewing] = useState<InspectionRecord | null>(null);

  const rows = recordsOf(selectedDay);

  return (
    <div className="flex h-dvh flex-col">
      <TopBar mode="control" />

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
          <DataText>{recordCountOfMonth(month)}</DataText>건
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
              markedDays={RECORD_DAYS}
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
            {rows.length === 0 ? (
              <p className="py-10 text-center text-body-md text-subtle">점검 기록 없음</p>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-surface">
                  <TableRow className="border-hairline hover:bg-surface">
                    {/* 폭은 브라우저의 auto 레이아웃에 맡긴다. 주소만 w-full로 남는 폭을 받고,
                        셀의 max-w-0과 짝이 되어야 잘린다 */}
                    <TableHead className="h-11 px-3 text-body-sm text-subtle">시각</TableHead>
                    <TableHead className="h-11 w-full px-3 text-body-sm text-subtle">주소</TableHead>
                    <TableHead className="h-11 px-3 text-body-sm text-subtle">세대</TableHead>
                    <TableHead className="h-11 px-3 text-body-sm text-subtle">승낙</TableHead>
                    <TableHead className="h-11 px-3 text-body-sm text-subtle">판정</TableHead>
                    <TableHead className="h-11 px-3 text-body-sm text-subtle">교체 완료</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((record) => (
                    <TableRow
                      key={record.id}
                      onClick={() => setViewing(record)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setViewing(record);
                        }
                      }}
                      className="h-12 cursor-pointer border-hairline hover:bg-surface-muted"
                    >
                      <TableCell className="px-3 text-body-md text-body">
                        <DataText>{record.time}</DataText>
                      </TableCell>
                      <TableCell className="max-w-0 truncate px-3 text-body-md text-ink">
                        {record.address}
                      </TableCell>
                      <TableCell className="px-3 text-body-md text-ink">
                        {record.unitLabel}
                      </TableCell>
                      <TableCell className="px-3 text-body-md text-body">
                        {record.form.consent ? CONSENT_STATUS[record.form.consent].label : "—"}
                      </TableCell>
                      <TableCell className="px-3">
                        <JudgementCell form={record.form} />
                      </TableCell>
                      <TableCell className="px-3">
                        <RxDoneCell form={record.form} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </section>
      </main>

      <RecordDetailDialog
        record={viewing}
        open={viewing !== null}
        onClose={() => setViewing(null)}
      />
    </div>
  );
}
