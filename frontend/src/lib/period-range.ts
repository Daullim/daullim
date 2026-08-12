import { todayDay } from "@/lib/units";

/** 서버에 보내는 일자 경계 (YYYYMMDD, 양끝 포함) */
export interface Range {
  from: string;
  to: string;
}

/** 화면이 고르는 월 경계 (YYYYMM) */
export interface MonthRange {
  fromMonth: string;
  toMonth: string;
}

export function currentMonth(): string {
  return todayDay().slice(0, 6);
}

export function thisMonthRange(): MonthRange {
  const month = currentMonth();
  return { fromMonth: month, toMonth: month };
}

export function monthKey(year: number, month: number): string {
  return `${year}${String(month).padStart(2, "0")}`;
}

/**
 * 월 경계를 일자 경계로 편다.
 *
 * **달 경계는 화면이 정한다** — 서버가 '이번 달'을 해석하면 KST 달력일과 어긋난다
 * (`/visits/summary` 규약). 말일은 다음 달 0일로 구해 윤년까지 맞는다.
 */
export function spanOf({ fromMonth, toMonth }: MonthRange): Range {
  const year = Number(toMonth.slice(0, 4));
  const month = Number(toMonth.slice(4, 6));
  const lastDate = new Date(year, month, 0).getDate();
  return { from: `${fromMonth}01`, to: `${toMonth}${String(lastDate).padStart(2, "0")}` };
}

/** 한 달이면 "2026년 8월", 같은 해면 "2026년 6월~8월", 해를 넘으면 양쪽에 연도 */
export function periodLabel({ fromMonth, toMonth }: MonthRange): string {
  const [fy, fm] = [fromMonth.slice(0, 4), Number(fromMonth.slice(4, 6))];
  const [ty, tm] = [toMonth.slice(0, 4), Number(toMonth.slice(4, 6))];
  if (fromMonth === toMonth) return `${fy}년 ${fm}월`;
  if (fy === ty) return `${fy}년 ${fm}월~${tm}월`;
  return `${fy}년 ${fm}월~${ty}년 ${tm}월`;
}

/** 포함 구간의 일수 — 일평균의 분모 */
export function dayCount(range: Range): number {
  const parse = (d: string) =>
    new Date(Number(d.slice(0, 4)), Number(d.slice(4, 6)) - 1, Number(d.slice(6, 8)));
  const diff = parse(range.to).getTime() - parse(range.from).getTime();
  return Math.max(1, Math.round(diff / 86_400_000) + 1);
}

/** 역전을 만들지 않는다 — 시작을 끝 뒤로 밀면 끝이 따라오고, 반대도 같다. */
export function clampRange(next: MonthRange, changed: "from" | "to"): MonthRange {
  if (next.fromMonth <= next.toMonth) return next;
  return changed === "from"
    ? { fromMonth: next.fromMonth, toMonth: next.fromMonth }
    : { fromMonth: next.toMonth, toMonth: next.toMonth };
}
