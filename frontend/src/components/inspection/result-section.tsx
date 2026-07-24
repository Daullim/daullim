import type * as React from "react";
import {
  CONSENT_STATUS,
  EXT_LOCATION,
  REVISIT_PLAN,
  ROOM_LABEL,
  RX,
  RX_DONE,
} from "@/config/domain";
import { DataText } from "@/components/core/data-text";
import { ChoiceGroup, ConditionBadge, FormSection } from "@/components/inspection/form-controls";
import {
  deriveRx,
  isAgeEstimated,
  judgeDetector,
  judgeExtinguisher,
  type InspectionAction,
  type InspectionFormState,
} from "@/lib/inspection";

/**
 * Step 3 — 자동 판정 (읽기전용 출력).
 * 판정 우선순위·법적 각주는 폼설계 정본 — 추정 폴백 기반 판정은 "(추정)" 동반 (NFR-04).
 */
export function ResultSection({ form }: { form: InspectionFormState }) {
  return (
    <FormSection title="Step 3 — 자동 판정">
      {form.detectors.length === 0 && form.extinguishers.length === 0 ? (
        <p className="rounded-sm bg-surface-muted px-3 py-2 text-body-sm text-subtle">
          체크리스트를 입력하면 판정이 표시됩니다
        </p>
      ) : (
        <ul className="space-y-2" aria-live="polite">
          {form.detectors.map((row, i) => {
            const code = judgeDetector(row);
            return (
              <li key={`det-${i}`} className="flex min-h-11 items-center justify-between gap-3">
                <span className="text-body-md text-ink">
                  감지기 · 실 <DataText>{i + 1}</DataText> ({ROOM_LABEL[row.roomLabel].label})
                </span>
                {row.installed === "missing" ? (
                  <span className="text-body-sm text-subtle">미설치 — 설치 권고</span>
                ) : code ? (
                  <ConditionBadge code={code} estimated={code === "EXPIRED" && isAgeEstimated(row)} />
                ) : (
                  <span className="text-body-sm text-subtle">입력 대기</span>
                )}
              </li>
            );
          })}
          {form.extinguishers.map((row, i) => {
            const code = judgeExtinguisher(row);
            return (
              <li key={`ext-${i}`} className="flex min-h-11 items-center justify-between gap-3">
                <span className="text-body-md text-ink">
                  소화기 <DataText>{i + 1}</DataText> ({EXT_LOCATION[row.location].label})
                </span>
                {row.installed === "missing" ? (
                  <span className="text-body-sm text-subtle">미설치 — 설치 권고</span>
                ) : code ? (
                  <ConditionBadge code={code} estimated={code === "EXPIRED" && isAgeEstimated(row)} />
                ) : (
                  <span className="text-body-sm text-subtle">입력 대기</span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* 법적 위험도 고정 각주 — 필수 상설 문구 */}
      <p className="rounded-sm bg-surface-muted px-3 py-2 text-caption text-body">
        본 주택은 자체점검 의무 특정소방대상물이 아니므로 시정명령·과태료 대상이 아닙니다. 모든
        안내는 소유자의 자율적 판단을 돕기 위한 권고입니다.
      </p>
      <p className="text-caption text-subtle">
        ※ 감지기 외관·권장연수(15년) 기준은 배선형 자탐설비 기준 준용 · 소화기 권장연수(10년)는
        공식 고시 확인 필요
      </p>
    </FormSection>
  );
}

/**
 * Step 4 — 사후관리 및 이행 조치.
 * 비승낙 방문에서는 재방문 필드만 실입력 (게이트 분기).
 */
export function PostSection({
  form,
  dispatch,
}: {
  form: InspectionFormState;
  dispatch: React.Dispatch<InspectionAction>;
}) {
  const accepted = form.consent === "accepted";
  const rxList = form.detectors
    .map((row, i) => ({ i, room: ROOM_LABEL[row.roomLabel].label, rx: deriveRx(row) }))
    .filter((x) => x.rx !== null);

  return (
    <FormSection title="Step 4 — 사후관리">
      {accepted && (
        <>
          {/* 처방 코드 — battery_type 연동 자동 부여 (읽기전용) */}
          <section aria-live="polite">
            <h4 className="mb-2 text-body-md text-ink">처방 (자동)</h4>
            {rxList.length > 0 ? (
              <ul className="space-y-1">
                {rxList.map(({ i, room, rx }) => (
                  <li
                    key={i}
                    className="rounded-sm border-l-4 border-l-brand bg-brand-tint px-3 py-2 text-body-md text-ink"
                  >
                    실 <DataText>{i + 1}</DataText> ({room}) — <DataText>{rx}</DataText>{" "}
                    {rx && RX[rx].label}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-sm bg-surface-muted px-3 py-2 text-body-md text-subtle">
                처방 없음 — 정상 작동
              </p>
            )}
          </section>

          <fieldset>
            <legend className="mb-2 text-body-md text-ink">현장 교체 완료 여부</legend>
            <ChoiceGroup
              options={RX_DONE}
              value={form.rxDone}
              onChange={(v) => dispatch({ type: "SET_RX_DONE", value: v })}
              columns={3}
              ariaPrefix="교체 완료 여부"
            />
          </fieldset>
        </>
      )}

      {/* 승낙 상태 — Step 0 게이트 값 읽기전용 에코 (재입력 없음) */}
      <div>
        <h4 className="mb-2 text-body-md text-ink">승낙 상태 (Step 0 확정값)</h4>
        <p className="rounded-sm bg-surface-muted px-3 py-2 text-body-md text-body">
          {form.consent ? CONSENT_STATUS[form.consent].label : "미선택"}
        </p>
      </div>

      <fieldset>
        <legend className="mb-2 text-body-md text-ink">
          재방문 필요 여부
          {form.refusalReason === "self-replaced" && (
            <span className="ml-1.5 text-caption text-subtle">
              (자체조치 신고 접수 — 재방문 불필요 기본값)
            </span>
          )}
        </legend>
        <ChoiceGroup
          options={REVISIT_PLAN}
          value={form.revisit}
          onChange={(v) => dispatch({ type: "SET_REVISIT", value: v })}
          columns={4}
          ariaPrefix="재방문 계획"
        />
      </fieldset>

      <div>
        <label htmlFor="insp-note" className="mb-2 block text-body-md text-ink">
          비고
        </label>
        <textarea
          id="insp-note"
          rows={3}
          value={form.note}
          onChange={(e) => dispatch({ type: "SET_NOTE", value: e.target.value })}
          placeholder="특이사항을 입력하세요"
          className="w-full rounded-sm border border-hairline-strong bg-surface px-3 py-2 text-body-md text-ink placeholder:text-subtle"
        />
      </div>
    </FormSection>
  );
}
