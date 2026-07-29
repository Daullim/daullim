import { XIcon } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/core/button";
import { DataText } from "@/components/core/data-text";
import { ReviewSection } from "@/components/inspection/review-section";
import { formatDay } from "@/lib/inspection";
import type { InspectionRecord } from "@/mock/records";

/**
 * 점검 기록 상세 — 점검 폼 마지막 단계(최종 확인) 레이아웃을 그대로 재사용한다.
 * ReviewSection이 원래 dispatch 없는 읽기전용이라 포크 없이 쓴다.
 */
export function RecordDetailDialog({
  record,
  open,
  onClose,
}: {
  record: InspectionRecord | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      {/* 기본 X는 sr-only 라벨이 영문이라 끄고 한국어 라벨 버튼을 직접 둔다 */}
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[85dvh] w-full max-w-160 flex-col gap-0 p-0"
      >
        <DialogHeader className="shrink-0 flex-row items-start justify-between gap-3 border-b border-hairline px-6 py-4 text-left">
          <div className="min-w-0 space-y-1">
            <DialogTitle className="truncate text-title text-ink">{record.address}</DialogTitle>
            <DialogDescription asChild>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-body">
                <span>{record.unitLabel}</span>
                <span>
                  점검일 <DataText>{formatDay(record.day)}</DataText>{" "}
                  <DataText>{record.time}</DataText>
                </span>
                <span>점검원 {record.inspectorName}</span>
              </div>
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <button
              type="button"
              aria-label="상세 닫기"
              className="flex size-11 shrink-0 items-center justify-center rounded-md text-ink hover:bg-surface-muted"
            >
              <XIcon aria-hidden className="size-5" />
            </button>
          </DialogClose>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <ReviewSection form={record.form} readOnly />

          {record.form.note && (
            <section>
              <h3 className="mb-2 text-title-sm text-ink">비고</h3>
              <p className="rounded-sm bg-surface-muted px-3 py-2 text-body-md text-body">
                {record.form.note}
              </p>
            </section>
          )}
        </div>

        {/* DialogFooter 기본값의 -mx-4 -mb-4는 DialogContent의 p-4를 전제한다. p-0이라 상쇄한다 */}
        <DialogFooter
          className="mx-0 mb-0 shrink-0 border-t border-hairline bg-surface px-6 py-4"
          showCloseButton={false}
        >
          <Button variant="secondary" onClick={onClose}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
