import type * as React from "react";
import { CONSENT_STATUS, RX_DONE } from "@/config/domain";
import { DataText } from "@/components/core/data-text";
import { ConditionBadge } from "@/components/inspection/form-controls";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDay, judgeAlarms, type InspectionFormState } from "@/lib/inspection";
import type { InspectionRecord } from "@/mock/records";
import { cn } from "@/lib/utils";

/** 비승낙은 경보기를 물리적으로 못 봐서 판정 자체가 없다 */
function JudgementCell({ form }: { form: InspectionFormState }) {
  const code = judgeAlarms(form);
  if (!code) return <span className="text-subtle">—</span>;
  return <ConditionBadge code={code} />;
}

export type RecordColumn = "day" | "time" | "address" | "unit" | "consent" | "condition" | "rxDone";

interface ColumnSpec {
  label: string;
  /** 남는 폭을 가져갈 컬럼. 셀의 max-w-0과 짝이 되어야 잘린다 */
  fill?: boolean;
  cell: (record: InspectionRecord) => React.ReactNode;
}

const COLUMNS: Record<RecordColumn, ColumnSpec> = {
  day: { label: "날짜", cell: (r) => <DataText>{formatDay(r.day)}</DataText> },
  time: { label: "시각", cell: (r) => <DataText>{r.time}</DataText> },
  address: { label: "주소", fill: true, cell: (r) => r.address },
  unit: { label: "세대", cell: (r) => r.unitLabel },
  consent: {
    label: "승낙",
    cell: (r) => (r.form.consent ? CONSENT_STATUS[r.form.consent].label : "—"),
  },
  condition: { label: "판정", cell: (r) => <JudgementCell form={r.form} /> },
  rxDone: {
    label: "교체 완료",
    cell: (r) =>
      r.form.rxDone ? RX_DONE[r.form.rxDone].label : <span className="text-subtle">—</span>,
  },
};

/**
 * 점검 기록 표 — 기록 조회 화면과 점검 폼의 세대 이력이 같은 서식을 쓴다.
 * onSelect가 없으면 읽기 전용 표가 된다.
 */
export function RecordTable({
  records,
  columns,
  onSelect,
}: {
  records: InspectionRecord[];
  columns: readonly RecordColumn[];
  onSelect?: (record: InspectionRecord) => void;
}) {
  return (
    <Table>
      <TableHeader className="sticky top-0 z-10 bg-surface">
        <TableRow className="border-hairline hover:bg-surface">
          {columns.map((id) => (
            <TableHead
              key={id}
              className={cn("h-11 px-3 text-body-sm text-subtle", COLUMNS[id].fill && "w-full")}
            >
              {COLUMNS[id].label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((record) => (
          <TableRow
            key={record.id}
            tabIndex={onSelect ? 0 : undefined}
            onClick={onSelect ? () => onSelect(record) : undefined}
            onKeyDown={
              onSelect
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(record);
                    }
                  }
                : undefined
            }
            className={cn(
              "h-12 border-hairline",
              onSelect ? "cursor-pointer hover:bg-surface-muted" : "hover:bg-surface",
            )}
          >
            {columns.map((id) => (
              <TableCell
                key={id}
                className={cn(
                  "px-3 text-body-md text-ink",
                  COLUMNS[id].fill && "max-w-0 truncate",
                )}
              >
                {COLUMNS[id].cell(record)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
