import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/* 날짜 키는 앱 전체 규약대로 YYYYMMDD 문자열이다 — Date로 왕복하지 않는다 */
const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (y: number, m: number, d: number) => `${y}${pad(m)}${pad(d)}`;

function shiftMonth(month: string, delta: number): string {
  const d = new Date(Number(month.slice(0, 4)), Number(month.slice(4, 6)) - 1 + delta, 1);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}`;
}

function shiftDay(day: string, delta: number): string {
  const d = new Date(
    Number(day.slice(0, 4)),
    Number(day.slice(4, 6)) - 1,
    Number(day.slice(6, 8)) + delta,
  );
  return dayKey(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/** 6주 × 7일 격자 — 해당 월이 아닌 칸은 null */
function weeksOf(month: string): (string | null)[][] {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(4, 6));
  const lead = new Date(y, m - 1, 1).getDay();
  const last = new Date(y, m, 0).getDate();

  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: last }, (_, i) => dayKey(y, m, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
}

const ARROW_DELTA: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
};

/** 월 캘린더 — 점검한 날에 점을 찍는다. 점은 시각 표식일 뿐이라 같은 정보를 sr-only로도 읽힌다. */
export function MonthCalendar({
  month,
  selectedDay,
  markedDays,
  onMonthChange,
  onSelectDay,
  className,
}: {
  /** YYYYMM */
  month: string;
  /** YYYYMMDD */
  selectedDay: string | null;
  markedDays: ReadonlySet<string>;
  onMonthChange: (month: string) => void;
  onSelectDay: (day: string) => void;
  className?: string;
}) {
  const weeks = weeksOf(month);
  const gridRef = useRef<HTMLDivElement>(null);
  /* 화살표 이동일 때만 포커스를 옮긴다 — 클릭 선택까지 가로채면 안 된다 */
  const movedByKey = useRef(false);

  useEffect(() => {
    if (!movedByKey.current) return;
    movedByKey.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${selectedDay}"]`)?.focus();
  }, [selectedDay]);

  /* 선택일이 이 달에 없으면 첫날을 탭 진입점으로 삼는다 (roving tabindex) */
  const inMonth = selectedDay?.startsWith(month) ? selectedDay : null;
  const tabStop = inMonth ?? weeks.flat().find(Boolean) ?? null;

  function handleKeyDown(e: React.KeyboardEvent) {
    const delta = ARROW_DELTA[e.key];
    if (delta === undefined) return;
    e.preventDefault();
    const next = shiftDay(inMonth ?? tabStop ?? month + "01", delta);
    movedByKey.current = true;
    if (!next.startsWith(month)) onMonthChange(next.slice(0, 6));
    onSelectDay(next);
  }

  return (
    <div className={cn("p-3", className)}>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          aria-label="이전 달"
          onClick={() => onMonthChange(shiftMonth(month, -1))}
          className="flex size-10 items-center justify-center rounded-md text-body hover:bg-surface-muted"
        >
          <ChevronLeft aria-hidden className="size-5" />
        </button>
        <span className="text-title-sm text-ink tabular-nums">
          {month.slice(0, 4)}.{month.slice(4, 6)}
        </span>
        <button
          type="button"
          aria-label="다음 달"
          onClick={() => onMonthChange(shiftMonth(month, 1))}
          className="flex size-10 items-center justify-center rounded-md text-body hover:bg-surface-muted"
        >
          <ChevronRight aria-hidden className="size-5" />
        </button>
      </div>

      <div
        ref={gridRef}
        role="grid"
        aria-label={`${month.slice(0, 4)}년 ${Number(month.slice(4, 6))}월 점검일`}
        onKeyDown={handleKeyDown}
      >
        <div role="row" className="grid grid-cols-7">
          {WEEKDAYS.map((w) => (
            <span
              key={w}
              role="columnheader"
              className="flex h-8 items-center justify-center text-caption text-subtle"
            >
              {w}
            </span>
          ))}
        </div>

        {weeks.map((week, i) => (
          <div key={i} role="row" className="grid grid-cols-7">
            {week.map((day, j) => (
              <div key={day ?? `x${j}`} role="gridcell" aria-selected={day === selectedDay}>
                {day ? (
                  <button
                    type="button"
                    data-day={day}
                    tabIndex={day === tabStop ? 0 : -1}
                    onClick={() => onSelectDay(day)}
                    className={cn(
                      "flex h-11 w-full flex-col items-center justify-center gap-0.5 rounded-sm border text-body-sm",
                      day === selectedDay
                        ? "border-brand bg-brand-tint text-brand-hover"
                        : "border-transparent text-ink hover:bg-surface-muted",
                    )}
                  >
                    <span className="tabular-nums">{Number(day.slice(6, 8))}</span>
                    {markedDays.has(day) && <span className="sr-only">점검 기록 있음</span>}
                    {/* 점이 없어도 자리를 비워 둬 숫자가 위아래로 흔들리지 않게 한다 */}
                    <span
                      aria-hidden
                      className={cn(
                        "size-1 rounded-full",
                        markedDays.has(day) ? "bg-brand" : "bg-transparent",
                      )}
                    />
                  </button>
                ) : (
                  <span className="block h-11" />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
