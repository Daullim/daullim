package com.daullim.backend.domain.visit.dto;

import java.time.Instant;

/**
 * G-2 목록 1행 — `/records` 표와 점검 폼의 세대 방문 이력이 같은 모양을 쓴다.
 *
 * <p>호수 표시는 서버가 만들지 않는다 — {@code hoNm}·{@code flrNo}를 그대로 내리고 조합은 FE의 {@code unitLabel()} 한 곳에서
 * 한다(세대 목록과 같은 규칙이어야 한다).
 *
 * <p>{@code conditionCode}·{@code rxDoneCd}는 비승낙 방문이면 null이다.
 */
public record VisitListItem(
    long visitId,
    long unitId,
    long buildingId,
    String visitedDay,
    Instant visitedAt,
    String address,
    String hoNm,
    Short flrNo,
    String consentCd,
    boolean inspected,
    String conditionCode,
    String rxDoneCd,
    String officerName) {}
