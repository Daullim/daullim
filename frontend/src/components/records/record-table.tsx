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
import { formatDay } from "@/lib/inspection";
import { unitLabel } from "@/lib/units";
import type { VisitListItem } from "@/api/types";
import { cn } from "@/lib/utils";

/** 없는 값의 자리 — 비승낙은 경보기를 물리적으로 못 봐서 판정 자체가 없다 */
function Dash() {
  return <span className="text-subtle">—</span>;
}

/** ISO 시각 → "HH:MM" (KST). 같은 날 기록의 정렬 기준이 시각이라 분까지만 보인다. */
function timeOf(visitedAt: string): string {
  return new Date(visitedAt).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export type RecordColumn =
  | "day"
  | "time"
  | "officer"
  | "address"
  | "unit"
  | "consent"
  | "condition"
  | "rxDone";

interface ColumnSpec {
  label: string;
  /** 남는 폭을 가져갈 컬럼. 셀의 max-w-0과 짝이 되어야 잘린다 */
  fill?: boolean;
  cell: (record: VisitListItem) => React.ReactNode;
}

/* 판정은 서버가 저장 시점에 계산해 둔 값을 그대로 쓴다 — 화면이 다시 판정하지 않는다. */
const COLUMNS: Record<RecordColumn, ColumnSpec> = {
  day: { label: "날짜", cell: (r) => <DataText>{formatDay(r.visitedDay)}</DataText> },
  time: { label: "시각", cell: (r) => <DataText>{timeOf(r.visitedAt)}</DataText> },
  /* 관제 5. 실적 통계 전용 — 관할 안 모든 점검원 기록이 섞여 오므로 누가 했는지가 정보값이다 */
  officer: { label: "점검자", cell: (r) => r.officerName },
  address: { label: "주소", fill: true, cell: (r) => r.address },
  unit: { label: "세대", cell: (r) => unitLabel(r) },
  consent: { label: "승낙", cell: (r) => CONSENT_STATUS[r.consentCd].label },
  condition: {
    label: "판정",
    cell: (r) => (r.conditionCode ? <ConditionBadge code={r.conditionCode} /> : <Dash />),
  },
  rxDone: {
    label: "교체 완료",
    cell: (r) => (r.rxDoneCd ? RX_DONE[r.rxDoneCd].label : <Dash />),
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
  records: VisitListItem[];
  columns: readonly RecordColumn[];
  onSelect?: (record: VisitListItem) => void;
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
            key={record.visitId}
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
