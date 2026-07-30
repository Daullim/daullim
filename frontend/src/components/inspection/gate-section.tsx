import type * as React from "react";
import { CONSENT_STATUS, REFUSAL_REASON, RESPONDENT_TYPE, type RefusalReason } from "@/config/domain";
import { RecordTable } from "@/components/records/record-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChoiceGroup, FormSection, InfoNote } from "@/components/inspection/form-controls";
import type { InspectionAction, InspectionFormState } from "@/lib/inspection";
import type { InspectionRecord } from "@/mock/records";

/** 이력 표는 세대가 이미 헤더에 있어 주소·세대를 빼고 언제 방문했는지를 앞에 둔다 */
const HISTORY_COLUMNS = ["day", "time", "consent", "condition", "rxDone"] as const;

/**
 * 1단계 — 방문 게이트 (승낙 확인).
 * 승낙이 성립하지 않으면 경보기·소화기 단계는 물리적으로 수행 불가 →
 * stepsFor()가 그 두 단계를 빼고 사후관리로 건너뛴다.
 */
export function GateSection({
  form,
  dispatch,
  history = [],
}: {
  form: InspectionFormState;
  dispatch: React.Dispatch<InspectionAction>;
  /** 이 세대의 지난 방문 — 없으면 표를 띄우지 않는다 */
  history?: InspectionRecord[];
}) {
  return (
    <FormSection>
      {/* 4-way 대형 버튼 — 폼 최초 입력, 64px (장갑 착용) */}
      <ChoiceGroup
        options={CONSENT_STATUS}
        value={form.consent}
        onChange={(v) => dispatch({ type: "SET_CONSENT", value: v })}
        size="lg"
        columns={2}
        ariaPrefix="방문 승낙 상태"
      />

      {form.consent === "accepted" && (
        <fieldset>
          <legend className="mb-2 text-body-md text-ink">응대자 유형 (필수)</legend>
          <ChoiceGroup
            options={RESPONDENT_TYPE}
            value={form.respondent}
            onChange={(v) => dispatch({ type: "SET_RESPONDENT", value: v })}
            columns={4}
            ariaPrefix="응대자 유형"
          />
          {form.respondent && form.respondent !== "owner" && (
            <InfoNote className="mt-2">
              설치·교체 의무는 소유자에게 있습니다(소방시설법 제8조) — 결과지를 소유자에게 전달
              안내
            </InfoNote>
          )}
        </fieldset>
      )}

      {form.consent === "refused" && (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-body-md text-ink" htmlFor="refusal-reason">
              거부 사유 (필수)
            </label>
            <Select
              value={form.refusalReason ?? undefined}
              onValueChange={(v) => dispatch({ type: "SET_REFUSAL_REASON", value: v as RefusalReason })}
            >
              <SelectTrigger id="refusal-reason" className="h-11 w-full border-hairline-strong">
                <SelectValue placeholder="사유를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(REFUSAL_REASON) as RefusalReason[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {REFUSAL_REASON[k].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.refusalReason === "etc" && (
            <div>
              <label className="mb-2 block text-body-md text-ink" htmlFor="refusal-note">
                보충 메모
              </label>
              <textarea
                id="refusal-note"
                rows={2}
                value={form.refusalNote}
                onChange={(e) => dispatch({ type: "SET_REFUSAL_NOTE", value: e.target.value })}
                placeholder="기타 사유·특이사항"
                className="w-full rounded-sm border border-hairline-strong bg-surface px-3 py-2 text-body-md text-ink placeholder:text-subtle"
              />
            </div>
          )}
        </div>
      )}

      {(form.consent === "vacant" || form.consent === "unreachable") && (
        <InfoNote>
          점검 항목 없이 저장할 수 있습니다 — 재방문 계획은 다음 단계(사후관리)에서 선택하세요
        </InfoNote>
      )}

      {history.length > 0 && (
        <section>
          <h3 className="mb-2 text-title-sm text-ink">이 세대의 지난 방문</h3>
          <div className="overflow-hidden rounded-md border border-hairline">
            <RecordTable records={history} columns={HISTORY_COLUMNS} />
          </div>
        </section>
      )}
    </FormSection>
  );
}
