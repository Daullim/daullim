package com.daullim.backend.domain.visit.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** 점검 폼 1건의 현장 원입력 */
public record VisitSubmission(
    Long unitId,
    Long officerId,
    UUID clientVisitId,

    // 방문 게이트
    String consentCode,
    String respondentTypeCode,
    String refusalReasonCode,
    String selfReportPeriodCode,
    String selfReportTestedCode,
    String refusalNote,

    // 경보기
    Integer roomCount,
    String mfgYm,
    String ageBandCode,
    Integer replaceCount,
    List<ReplacementInput> replacements,

    // 소화기·사후관리
    String extinguisherInstalledCode,
    String rxDoneCode,
    String revisitPlanCode,
    String note,

    // 배차 스냅샷
    Short routeOrder,
    BigDecimal dispatchedScore,
    Integer dispatchedOrderKey,
    String scoreVersion,
    BigDecimal gpsLat,
    BigDecimal gpsLng) {

  public VisitSubmission {
    replacements = replacements == null ? List.of() : List.copyOf(replacements);
  }

  /** 게이트 하위 필드를 상위 선택에 맞춰 지운다. */
  public VisitSubmission normalized() {
    boolean refused = "refused".equals(consentCode);

    return new VisitSubmission(
        unitId,
        officerId,
        clientVisitId,
        consentCode,
        respondentTypeCode,
        refused ? refusalReasonCode : null,
        // selfReplaced(자가신고) 삭제하였으므로 null로 비움
        null,
        null,
        refused ? refusalNote : null,
        roomCount,
        mfgYm,
        ageBandCode,
        replaceCount,
        replacements,
        extinguisherInstalledCode,
        rxDoneCode,
        revisitPlanCode,
        note,
        routeOrder,
        dispatchedScore,
        dispatchedOrderKey,
        scoreVersion,
        gpsLat,
        gpsLng);
  }
}
