import {
  CONSENT_STATUS,
  INSTALLED,
  REPLACE_REASON,
  REVISIT_PLAN,
  RX,
  RX_DONE,
  SERVICE_LIFE_YEARS,
} from "@/config/domain";
import { DataText } from "@/components/core/data-text";
import { ConditionBadge, FormSection, InfoNote } from "@/components/inspection/form-controls";
import {
  deriveRxList,
  effectiveReplaceCount,
  isAgeEstimated,
  judgeAlarms,
  missingItems,
  reasonSummary,
  type InspectionFormState,
} from "@/lib/inspection";

/** 요약 한 줄 — 라벨/값 */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li className="flex min-h-11 items-center justify-between gap-3 border-b border-hairline last:border-b-0">
      <span className="text-body-sm text-subtle">{label}</span>
      <span className="text-right text-body-md text-ink">{children}</span>
    </li>
  );
}

/**
 * 최종 확인 — 제출 직전 누락 점검 + 자동 판정 요약(읽기전용).
 * 판정 우선순위·법적 각주는 폼설계 정본 — 추정 폴백 기반 판정은 "(추정)" 동반 (NFR-04).
 */
export function ReviewSection({
  form,
  readOnly = false,
}: {
  form: InspectionFormState;
  /** 저장된 기록 조회용 — 제출 안내·법적 각주와 값 변경 알림을 끄고 요약 표만 남긴다 */
  readOnly?: boolean;
}) {
  const accepted = form.consent === "accepted";
  const missing = missingItems(form);
  const code = judgeAlarms(form);
  const rxList = deriveRxList(form);
  const count = effectiveReplaceCount(form);
  const reasons = reasonSummary(form);

  return (
    <FormSection>
      {!readOnly &&
        (missing.length > 0 ? (
          <InfoNote tone="negative">
            아직 채우지 않은 단계가 있습니다 — {missing.join(" · ")}. 이전으로 돌아가 입력해 주세요.
          </InfoNote>
        ) : (
          <InfoNote tone="positive">
            입력이 모두 끝났습니다. 아래 내용을 확인하고 제출하세요.
          </InfoNote>
        ))}

      <ul aria-live={readOnly ? undefined : "polite"}>
        <Row label="방문 세대">{form.unitLabel || "미지정"}</Row>
        <Row label="방문 승낙">
          {form.consent ? CONSENT_STATUS[form.consent].label : "미선택"}
        </Row>
        {accepted && (
          <>
            <Row label="구획된 실">
              {form.roomCount ? <DataText>{form.roomCount}</DataText> : "—"}개
            </Row>
            <Row label="제조연차">
              {form.mfgYm ? (
                <DataText>{form.mfgYm.replace("-", ".")}</DataText>
              ) : form.ageBand ? (
                <span>구간 추정</span>
              ) : (
                "—"
              )}
            </Row>
            <Row label="교체 필요">
              {count !== null ? <DataText>{count}</DataText> : "—"}개
              {reasons.length > 0 && (
                <span className="text-subtle">
                  {" — "}
                  {reasons
                    .map(({ reason, count: n }) => `${REPLACE_REASON[reason].label} ${n}`)
                    .join(" · ")}
                </span>
              )}
            </Row>
            <Row label="경보기 판정">
              {code ? (
                <ConditionBadge code={code} estimated={code === "EXPIRED" && isAgeEstimated(form)} />
              ) : (
                <span className="text-subtle">입력 대기</span>
              )}
            </Row>
            <Row label="처방">
              {rxList.length > 0 ? (
                rxList.map(({ rx, count: n }, i) => (
                  <span key={rx}>
                    {i > 0 && " · "}
                    <DataText>{rx}</DataText> {RX[rx].label} <DataText>{n}</DataText>건
                  </span>
                ))
              ) : (
                <span className="text-subtle">처방 없음</span>
              )}
            </Row>
            <Row label="소화기">
              {form.extinguisherInstalled
                ? INSTALLED[form.extinguisherInstalled].label
                : "—"}
            </Row>
            <Row label="현장 교체">
              {form.rxDone ? RX_DONE[form.rxDone].label : <span className="text-subtle">미선택</span>}
            </Row>
          </>
        )}
        <Row label="재방문">
          {form.revisit ? REVISIT_PLAN[form.revisit].label : <span className="text-subtle">미선택</span>}
        </Row>
      </ul>

      {/* 법적 위험도 고정 각주 — 작성 화면의 필수 상설 문구. 저장된 기록 조회에는 띄우지 않는다 */}
      {!readOnly && (
        <>
          <InfoNote>
            본 주택은 자체점검 의무 특정소방대상물이 아니므로 시정명령·과태료 대상이 아닙니다. 모든
            안내는 소유자의 자율적 판단을 돕기 위한 권고입니다.
          </InfoNote>
          <p className="text-caption text-subtle">
            ※ 감지기 외관·권장연수(<DataText>{SERVICE_LIFE_YEARS.detector}</DataText>년) 기준은
            배선형 자탐설비 기준 준용
          </p>
        </>
      )}
    </FormSection>
  );
}
