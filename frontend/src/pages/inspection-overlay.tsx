import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/core/button";
import { DataText } from "@/components/core/data-text";
import { EstimateBorder } from "@/components/core/estimate-border";
import {
  ALARM_CHECK,
  RX,
  VISIT_OUTCOME,
  type AlarmCheck,
  type VisitOutcome,
} from "@/config/domain";
import type { HouseholdItem } from "@/mock/sample";
import { cn } from "@/lib/utils";

/* 선택형 버튼 공통 — Active·Selected = 악센트 틴트 + 악센트 보더 (공통 문법) */
function choiceClass(selected: boolean) {
  return cn(
    "rounded-md border text-title-sm text-ink hover:bg-surface-muted",
    selected
      ? "border-brand bg-brand-tint text-brand-hover hover:bg-brand-tint"
      : "border-hairline-strong bg-surface",
  );
}

/**
 * 아키타입 C — /field 점검 오버레이.
 * focus trap·ESC 닫기·포커스 복귀는 Radix Dialog에 위임 (직접 구현 금지).
 * Tab 순서 = 시각 순서: 방문상태 → 작동여부 → 비고 → 저장.
 */
export function InspectionOverlay({
  item,
  open,
  onClose,
  onSaved,
}: {
  item: HouseholdItem | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [outcome, setOutcome] = useState<VisitOutcome | null>(null);
  const [check, setCheck] = useState<AlarmCheck | null>(null);
  const rx = check ? ALARM_CHECK[check].rx : null;

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden rounded-lg p-0 shadow-e2 sm:max-w-xl">
        {/* 가구정보 헤더 */}
        <DialogHeader className="shrink-0 space-y-1 border-b border-hairline px-6 py-4 text-left">
          <DialogTitle className="text-title text-ink">{item.address}</DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-body">
              <span>
                모델 <DataText>{item.model}</DataText>
              </span>
              <span>
                보급 <DataText>{item.installYear}</DataText>년
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-status-info-tint px-2.5 py-0.5 text-caption text-status-info">
                GPS 일치
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* 방문상태 — 열거값은 config 주입 */}
          <fieldset>
            <legend className="mb-2 text-title-sm text-ink">방문 상태</legend>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(VISIT_OUTCOME) as VisitOutcome[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={outcome === k}
                  onClick={() => setOutcome(k)}
                  className={cn("h-11", choiceClass(outcome === k))}
                >
                  {VISIT_OUTCOME[k].label}
                </button>
              ))}
            </div>
          </fieldset>

          {/* 작동여부 3-way — 최소 64px (장갑 착용) */}
          <fieldset disabled={outcome !== "met"} className="disabled:opacity-50">
            <legend className="mb-2 text-title-sm text-ink">경보기 작동 여부</legend>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(ALARM_CHECK) as AlarmCheck[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={check === k}
                  aria-label={`작동 여부: ${ALARM_CHECK[k].label}`}
                  onClick={() => setCheck(k)}
                  className={cn("h-16", choiceClass(check === k))}
                >
                  {ALARM_CHECK[k].label}
                </button>
              ))}
            </div>
          </fieldset>

          {/* 동적 처방 — 작동여부에 따라 도출 */}
          <section aria-live="polite">
            <h3 className="mb-2 text-title-sm text-ink">처방</h3>
            {rx ? (
              <p className="rounded-sm border-l-4 border-l-brand bg-brand-tint px-3 py-2 text-body-md text-ink">
                <DataText>{rx}</DataText> {RX[rx].label}
              </p>
            ) : (
              <p className="rounded-sm bg-surface-muted px-3 py-2 text-body-md text-subtle">
                {check === "normal" ? "처방 없음 — 정상 작동" : "작동 여부를 선택하면 처방이 표시됩니다"}
              </p>
            )}
          </section>

          {/* 비고 */}
          <div>
            <label htmlFor="insp-note" className="mb-2 block text-title-sm text-ink">
              비고
            </label>
            <textarea
              id="insp-note"
              rows={3}
              placeholder="특이사항을 입력하세요"
              className="w-full rounded-sm border border-hairline-strong bg-surface px-3 py-2 text-body-md text-ink placeholder:text-subtle"
            />
          </div>

          {/* 추정값 예시 — 실측/추정은 형태로 구분 */}
          {item.estimated && (
            <EstimateBorder kind="estimated">
              <span className="text-body-sm text-body">
                보급연차는 보급 대장 기반 추정치입니다
              </span>
            </EstimateBorder>
          )}
        </div>

        {/* 하단 고정 저장 바 */}
        <div className="flex shrink-0 gap-2 border-t border-hairline bg-surface px-6 py-4">
          <Button variant="secondary" size="field-xl" className="w-32" onClick={onClose}>
            취소
          </Button>
          <Button
            variant="primary"
            size="field-xl"
            className="flex-1"
            disabled={!outcome || (outcome === "met" && !check)}
            onClick={onSaved}
          >
            저장
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
