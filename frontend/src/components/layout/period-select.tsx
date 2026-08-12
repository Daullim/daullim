import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { clampRange, currentMonth, monthKey, type MonthRange } from "@/lib/period-range";

/** 고를 수 있는 연도 폭 — 시연 데이터가 올해뿐이라 뒤로 2년이면 족하다 */
const YEAR_SPAN = 3;

const TRIGGER = "h-9 min-w-22 rounded-sm border-hairline-strong bg-surface data-[size=default]:h-9";

/**
 * 관제 기간 셀렉터 — `n년 n월 ~ n년 n월`.
 *
 * 3·4·5 탭이 각자 기간을 들되 조작은 한 벌이다. 프리셋을 두지 않는 이유는 보고 기간이
 * 월·분기·반기로 갈려 프리셋 목록이 곧 부족해지기 때문이다.
 */
export function PeriodSelect({
  value,
  onChange,
}: {
  value: MonthRange;
  onChange: (next: MonthRange) => void;
}) {
  const emit = (next: MonthRange, changed: "from" | "to") => onChange(clampRange(next, changed));

  return (
    <span className="flex flex-wrap items-center gap-1">
      <MonthSelect
        value={value.fromMonth}
        label="시작"
        onChange={(fromMonth) => emit({ ...value, fromMonth }, "from")}
      />
      <span aria-hidden className="px-1 text-body-md text-subtle">
        ~
      </span>
      <MonthSelect
        value={value.toMonth}
        label="종료"
        onChange={(toMonth) => emit({ ...value, toMonth }, "to")}
      />
    </span>
  );
}

function MonthSelect({
  value,
  label,
  onChange,
}: {
  value: string;
  label: string;
  onChange: (next: string) => void;
}) {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const thisYear = Number(currentMonth().slice(0, 4));
  const years = Array.from({ length: YEAR_SPAN }, (_, i) => thisYear - i);

  return (
    <>
      <Select value={String(year)} onValueChange={(v) => onChange(monthKey(Number(v), month))}>
        <SelectTrigger aria-label={`${label} 연도 선택`} className={TRIGGER}>
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
        <SelectTrigger aria-label={`${label} 월 선택`} className={TRIGGER}>
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
