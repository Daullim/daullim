import type * as React from "react";
import { INSTALLED } from "@/config/domain";
import { DataText } from "@/components/core/data-text";
import { ChoiceGroup, FormSection, InfoNote } from "@/components/inspection/form-controls";
import type { InspectionAction, InspectionFormState } from "@/lib/inspection";

/**
 * Step 2 — 소화기.
 * 개수를 세지 않는다 (설치/미설치 2택만). 지시압력계는 입력 없이 안내문구로만 둔다.
 */
export function ExtinguisherSection({
  form,
  dispatch,
}: {
  form: InspectionFormState;
  dispatch: React.Dispatch<InspectionAction>;
}) {
  return (
    <FormSection>
      <fieldset>
        <legend className="mb-2 text-body-md text-ink">소화기 설치 여부 (필수)</legend>
        <ChoiceGroup
          options={INSTALLED}
          value={form.extinguisherInstalled}
          onChange={(v) => dispatch({ type: "SET_EXTINGUISHER_INSTALLED", value: v })}
          size="lg"
          columns={2}
          ariaPrefix="소화기 설치 여부"
        />
      </fieldset>

      {form.extinguisherInstalled === "installed" && (
        /* 지시압력계는 기록 항목이 아니라 현장 안내 — 입력란을 두지 않는다 */
        <InfoNote>
          지시압력계 바늘이 <strong className="text-ink">녹색 범위</strong>에 있는지 함께 확인하고,
          범위를 벗어났거나 압력계가 없으면(가압식 의심) 거주자에게 교체·회수를 안내하세요.
        </InfoNote>
      )}

      {form.extinguisherInstalled === "missing" && (
        <InfoNote tone="caution">
          미설치 — 세대별 <DataText>1</DataText>개 이상 비치가 의무입니다(소방시설법 제8조). 설치를
          안내하세요.
        </InfoNote>
      )}
    </FormSection>
  );
}
