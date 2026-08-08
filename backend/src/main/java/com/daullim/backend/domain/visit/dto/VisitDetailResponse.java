package com.daullim.backend.domain.visit.dto;

import java.time.Instant;
import java.util.List;

/**
 * H-1 상세 — 현장 원입력 + 서버가 계산한 파생 스냅샷 + 교체 항목.
 *
 * <p>화면은 이 응답을 점검 폼의 최종 확인 단계(`ReviewSection`)에 그대로 되돌려 그린다. 그래서 저장 요청({@code VisitSubmitRequest})의
 * 필드를 모두 되돌려 주고, 거기에 서버만 아는 값({@code expired}·{@code effectiveReplaceCount}·{@code
 * conditionCode}·{@code ruleVersion})을 얹는다.
 *
 * <p>{@code ruleVersion}은 그때의 판정 규칙이다 — 규칙이 바뀌어도 과거 판정을 재해석하지 않는다.
 */
public record VisitDetailResponse(
    long visitId,
    long unitId,
    long buildingId,
    String address,
    String hoNm,
    Short flrNo,
    String visitedDay,
    Instant visitedAt,
    String officerName,

    // 방문 게이트
    String consentCd,
    boolean inspected,
    String respondentTypeCd,
    String refusalReasonCd,
    String refusalNote,

    // 경보기 — 원입력과 파생이 섞여 있다
    Short roomCount,
    String mfgYm,
    boolean mfgUnmarked,
    Short replaceCount,
    Boolean expired,
    Short effectiveReplaceCount,
    String conditionCode,

    // 소화기·사후관리
    String extinguisherInstalledCd,
    String rxDoneCd,
    String revisitPlanCd,
    String noRevisitNote,
    String note,
    String ruleVersion,
    List<ReplacementItemResponse> replacements) {}
