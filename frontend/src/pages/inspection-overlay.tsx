import { useEffect, useReducer, useRef, useState } from "react";
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
import { InfoNote } from "@/components/inspection/form-controls";
import { GateSection } from "@/components/inspection/gate-section";
import { AlarmSection } from "@/components/inspection/alarm-section";
import { ExtinguisherSection } from "@/components/inspection/extinguisher-section";
import { PostSection } from "@/components/inspection/result-section";
import { ReviewSection } from "@/components/inspection/review-section";
import {
  STEP_LABEL,
  canAdvance,
  canSubmit,
  createInitialState,
  inspectionReducer,
  stepsFor,
} from "@/lib/inspection";
import type { ConsentStatus } from "@/config/domain";
import type { HouseholdItem } from "@/mock/sample";
import { recordsOfUnit } from "@/mock/records";

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
 * 폼 정본: 일반주택-현장점검-폼설계.md — Step 0 게이트 분기 필수.
 * 대상물 분류(구 Step 1)는 B3 세대 패널로 이관 — 여기는 Step 0~3.
 */
export function InspectionOverlay({
  item,
  unitLabel,
  open,
  onClose,
  onSaved,
}: {
  item: HouseholdItem | null;
  /** 세대 목록에서 고른 호수 — 저장 payload의 세대 식별값 (폼에 입력란 없음) */
  unitLabel?: string;
  open: boolean;
  onClose: () => void;
  /** 저장된 게이트 결과 — 호출부가 세대 상태로 환산한다 */
  onSaved: (consent: ConsentStatus | null) => void;
}) {
  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false} className={FULLSCREEN_CLASS}>
        {/* key = 가구·세대 전환 시 폼 상태 리셋 (닫힘 언마운트의 이중 안전장치) */}
        <InspectionForm
          key={`${item.rank}-${unitLabel ?? ""}`}
          item={item}
          unitLabel={unitLabel}
          onClose={onClose}
          onSaved={onSaved}
        />
      </DialogContent>
    </Dialog>
  );
}

function InspectionForm({
  item,
  unitLabel,
  onClose,
  onSaved,
}: {
  item: HouseholdItem;
  unitLabel?: string;
  onClose: () => void;
  onSaved: (consent: ConsentStatus | null) => void;
}) {
  const [form, dispatch] = useReducer(inspectionReducer, undefined, () =>
    createInitialState(item, unitLabel),
  );
  const sectionProps = { form, dispatch };
  const history = recordsOfUnit(item.rank, form.unitLabel);

  /* 단계 배열은 승낙 여부에 따라 5개 ↔ 3개로 바뀐다 → 인덱스만 들고 나머지는 파생 */
  const [stepIndex, setStepIndex] = useState(0);
  const steps = stepsFor(form);
  const current = Math.min(stepIndex, steps.length - 1);
  const step = steps[current];
  const isLast = current === steps.length - 1;
  /* 다음 버튼 = 다음 단계의 번호·이름 그대로 (마지막만 제출) */
  const nextLabel = isLast
    ? "제출하기"
    : `Step ${current + 2} - ${STEP_LABEL[steps[current + 1]]} →`;

  /* Radix는 단계 전환을 모른다(트리가 계속 마운트) → 스크롤·포커스를 직접 옮긴다 */
  const bodyRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    headingRef.current?.focus();
  }, [step]);

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

      {/* 본문 — 한 화면에 한 단계만 */}
      <div ref={bodyRef} className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5 sm:px-40">
        {/* 단계 제목 — 단계 전환 시 포커스 착지점 (스크린리더가 새 단계를 읽는다) */}
        <div ref={headingRef} tabIndex={-1} className="outline-none">
          <p className="text-caption text-subtle">
            Step <DataText>{current + 1}</DataText> / <DataText>{steps.length}</DataText>
          </p>
          <h2 className="text-display text-ink">{STEP_LABEL[step]}</h2>
        </div>

        {step === "gate" && <GateSection {...sectionProps} history={history} />}
        {step === "alarm" && <AlarmSection {...sectionProps} />}
        {step === "extinguisher" && <ExtinguisherSection {...sectionProps} />}
        {step === "post" && <PostSection {...sectionProps} />}
        {step === "review" && <ReviewSection form={form} />}

        {/* 점검 범위 법적 고지 — 폼 어디에도 중복되지 않는 유일한 문구 */}
        <InfoNote>
          본 점검은 소방시설법 제8조에 따른 주택용 소방시설(단독경보형감지기·소화기)에 한정됩니다.
          승낙 기반 점검이며 강제 사항이 아닙니다.
        </InfoNote>
      </div>

      {/* 하단 고정 위저드 바 — 좌 보조(field-lg) / 우 주요(field-xl) */}
      <div className="flex shrink-0 items-center gap-2 border-t border-hairline bg-surface px-6 py-4 sm:px-10">
        <Button
          variant="secondary"
          size="field-xl"
          className="w-32"
          onClick={() => (current === 0 ? onClose() : setStepIndex(current - 1))}
        >
          {current === 0 ? "취소" : "이전"}
        </Button>
        <Button
          variant="primary"
          size="field-xl"
          className="flex-1"
          disabled={isLast ? !canSubmit(form) : !canAdvance(form, step)}
          onClick={() => (isLast ? onSaved(form.consent) : setStepIndex(current + 1))}
        >
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}
