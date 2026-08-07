package com.daullim.backend.domain.visit.dto;

import com.daullim.backend.domain.visit.service.VisitSubmission;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * G-1 요청 — 현장 점검 폼 1건의 원입력. FE {@code InspectionFormState}가 원형이다.
 *
 * <p><b>원입력만 받는다.</b> 판정({@code isExpired}·{@code conditionCode})·처방({@code rxCode})·{@code
 * effectiveReplaceCount}는 본문에 없다 — 서버가 다시 계산한다. {@code officerId}도 없다(JWT의 {@code sub}), 멱등 키도
 * 없다({@code Idempotency-Key} 헤더).
 *
 * <p>비승낙(거부·공가·연락두절)이면 경보기·소화기 필드를 보내지 않는다. 실려 와도 저장되지 않는다 — {@code VisitSubmissionService}가
 * 지운다(ck_v_na).
 *
 * <p>여기 붙은 제약은 lookup이 받지 않는 CHECK 열거값·형식·자릿수뿐이다(위반 시 400). lookup이 받는 코드값 — {@code consentCd}와
 * {@code replacements[]} — 은 {@code CodeBook}이 422로 돌려준다.
 */
public record VisitSubmitRequest(
    // 방문 게이트 (CHECK ⑥)
    @NotBlank(message = "방문 승낙 상태는 필수입니다.") String consentCd,
    @Pattern(regexp = "owner|tenant|family|etc", message = "응대자 유형이 올바르지 않습니다.") String respondentTypeCd,
    @Pattern(regexp = "no-need|distrust|no-time|etc", message = "거부 사유가 올바르지 않습니다.") String refusalReasonCd,
    String refusalNote,

    // 경보기 (CHECK ③④). 상한은 smallint의 범위다 — 넘기면 short 캐스팅이 조용히 뒤집힌다.
    @Positive(message = "구획된 실 개수는 1 이상이어야 합니다.") @Max(value = Short.MAX_VALUE, message = "구획된 실 개수가 너무 큽니다.") Integer roomCount,
    @Pattern(regexp = "\\d{4}-(0[1-9]|1[0-2])", message = "제조년월은 YYYY-MM 형식이어야 합니다.") String mfgYm,
    Boolean mfgUnmarked,
    @PositiveOrZero(message = "교체 필요 개수는 0 이상이어야 합니다.") @Max(value = Short.MAX_VALUE, message = "교체 필요 개수가 너무 큽니다.") Integer replaceCount,
    List<ReplacementRequest> replacements,

    // 소화기·사후관리 (CHECK ⑤)
    @Pattern(regexp = "installed|missing", message = "소화기 설치 여부가 올바르지 않습니다.") String extinguisherInstalledCd,
    @Pattern(regexp = "done|advised-only", message = "현장 교체 여부가 올바르지 않습니다.") String rxDoneCd,
    @NotBlank(message = "재방문 필요 여부는 필수입니다.") @Pattern(regexp = "not-needed|revisit", message = "재방문 필요 여부가 올바르지 않습니다.") String revisitPlanCd,
    String noRevisitNote,
    String note,

    // 배차 스냅샷 — 큐가 내려준 값을 그대로 되돌려 받는다. 자릿수는 컬럼 정의와 같다.
    Short routeOrder,
    @Digits(integer = 3, fraction = 2, message = "배차 점수 자릿수가 올바르지 않습니다.") BigDecimal dispatchedScore,
    Integer dispatchedOrderKey,
    @Size(max = 20, message = "점수 버전은 20자 이하입니다.") String scoreVersion,
    @Digits(integer = 3, fraction = 6, message = "위도 자릿수가 올바르지 않습니다.") BigDecimal gpsLat,
    @Digits(integer = 3, fraction = 6, message = "경도 자릿수가 올바르지 않습니다.") BigDecimal gpsLng) {

  /** 신뢰 경계 — 세대·점검원·멱등 키는 본문이 아니라 경로·토큰·헤더에서 온다. */
  public VisitSubmission toSubmission(long unitId, long officerId, UUID clientVisitId) {
    return new VisitSubmission(
        unitId,
        officerId,
        clientVisitId,
        consentCd,
        respondentTypeCd,
        refusalReasonCd,
        refusalNote,
        roomCount,
        mfgYm,
        Boolean.TRUE.equals(mfgUnmarked),
        replaceCount,
        replacements == null
            ? List.of()
            : replacements.stream().map(ReplacementRequest::toInput).toList(),
        extinguisherInstalledCd,
        rxDoneCd,
        revisitPlanCd,
        noRevisitNote,
        note,
        routeOrder,
        dispatchedScore,
        dispatchedOrderKey,
        scoreVersion,
        gpsLat,
        gpsLng);
  }
}
