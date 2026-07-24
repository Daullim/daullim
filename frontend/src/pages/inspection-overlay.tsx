import { useReducer } from "react";
import { XIcon } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/core/button";
import { DataText } from "@/components/core/data-text";
import { HonestyLabel } from "@/components/core/honesty-label";
import { GateSection } from "@/components/inspection/gate-section";
import { TargetSection } from "@/components/inspection/target-section";
import { ChecklistSection } from "@/components/inspection/checklist-section";
import { PostSection, ResultSection } from "@/components/inspection/result-section";
import { canSave, createInitialState, inspectionReducer } from "@/lib/inspection";
import type { HouseholdItem } from "@/mock/sample";

/**
 * 풀스크린 오버라이드 — base DialogContent의 중앙 카드 클래스를 twMerge로 소거.
 * inset-0이 top/left-1/2를, translate-x/y-0이 -translate-1/2를 덮는다.
 * sm:max-w-sm은 modifier별로 별도 소거 필요.
 */
const FULLSCREEN_CLASS =
  "inset-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none bg-surface p-0 ring-0 sm:max-w-none";

/**
 * 아키타입 C — /field 점검보고서 작성 (풀스크린).
 * focus trap·ESC 닫기·포커스 복귀는 Radix Dialog에 위임 (직접 구현 금지).
 * 폼 정본: 일반주택-현장점검-폼설계.md Step 0~4 — Step 0 게이트 분기 필수.
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
  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false} className={FULLSCREEN_CLASS}>
        {/* key = 가구 전환 시 폼 상태 리셋 (닫힘 언마운트의 이중 안전장치) */}
        <InspectionForm key={item.rank} item={item} onClose={onClose} onSaved={onSaved} />
      </DialogContent>
    </Dialog>
  );
}

function InspectionForm({
  item,
  onClose,
  onSaved,
}: {
  item: HouseholdItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, dispatch] = useReducer(inspectionReducer, item, createInitialState);
  const accepted = form.consent === "accepted";
  const sectionProps = { form, dispatch };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* 상단 고정 헤더 — 좌: 가구 정보 / 우: 닫기 (≥44px 터치타깃) */}
      <DialogHeader className="shrink-0 flex-row items-start justify-between gap-3 border-b border-hairline px-6 py-4 text-left sm:px-10">
        <div className="min-w-0 space-y-1">
          <DialogTitle className="truncate text-title text-ink">{item.address}</DialogTitle>
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
        </div>
        <DialogClose asChild>
          <button
            type="button"
            aria-label="점검 폼 닫기"
            className="flex size-12 shrink-0 items-center justify-center rounded-md text-ink hover:bg-surface-muted"
          >
            <XIcon className="size-6" />
          </button>
        </DialogClose>
      </DialogHeader>

      {/* 본문 — 세로 스크롤, 섹션 간 24px */}
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5 sm:px-40">
        <HonestyLabel>
          실선 = 실측 · 점선 = 추정 — 자가신고·연차 구간은 추정으로 기록되어 실측과 분리됩니다
        </HonestyLabel>

        <GateSection {...sectionProps} />

        {/* 게이트 분기 — 승낙일 때만 Step 1~3 (비승낙은 물리적으로 수행 불가) */}
        {accepted && (
          <>
            <TargetSection item={item} {...sectionProps} />
            <ChecklistSection item={item} {...sectionProps} />
            <ResultSection form={form} />
          </>
        )}

        {form.consent !== null && <PostSection {...sectionProps} />}
      </div>

      {/* 하단 고정 액션 바 */}
      <div className="flex shrink-0 gap-2 border-t border-hairline bg-surface px-6 py-4 sm:px-10">
        <Button variant="secondary" size="field-xl" className="w-32" onClick={onClose}>
          취소
        </Button>
        <Button
          variant="primary"
          size="field-xl"
          className="flex-1"
          disabled={!canSave(form)}
          onClick={onSaved}
        >
          저장
        </Button>
      </div>
    </div>
  );
}
