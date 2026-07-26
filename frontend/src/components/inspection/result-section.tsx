import type * as React from "react";
import { CONSENT_STATUS, REVISIT_PLAN, RX, RX_DONE } from "@/config/domain";
import { DataText } from "@/components/core/data-text";
import { ChoiceGroup, FormSection, InfoNote } from "@/components/inspection/form-controls";
import { deriveRxList, type InspectionAction, type InspectionFormState } from "@/lib/inspection";

/**
 * 사후관리 및 이행 조치.
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
  const rxList = deriveRxList(form);

  return (
    <FormSection>
      {accepted && (
        <>
          {/* 처방 코드 — 교체 사유 + battery_type 연동 자동 부여 (읽기전용) */}
          <section aria-live="polite">
            <h4 className="mb-2 text-body-md text-ink">처방 (자동)</h4>
            {rxList.length > 0 ? (
              <ul className="space-y-1">
                {rxList.map(({ rx, count }) => (
                  <li
                    key={rx}
                    className="rounded-sm border-l-4 border-l-brand bg-brand-tint px-3 py-2 text-body-md text-ink"
                  >
                    <DataText>{rx}</DataText> {RX[rx].label} — <DataText>{count}</DataText>건
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

      {/* 승낙 상태 — 게이트 값 읽기전용 에코 (재입력 없음) */}
      <div>
        <h4 className="mb-2 text-body-md text-ink">승낙 상태 (방문 승낙 단계 확정값)</h4>
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
          columns={2}
          ariaPrefix="재방문 필요 여부"
        />
        <InfoNote className="mt-2">
          재방문 사유는 방문 결과에서 자동 기록됩니다. 채널(우편·기관 경유·직접 재방문)은 재방문
          큐에서 사유 기반으로 자동 제안됩니다.
        </InfoNote>
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
