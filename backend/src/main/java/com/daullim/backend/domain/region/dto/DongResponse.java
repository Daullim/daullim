package com.daullim.backend.domain.region.dto;

import java.math.BigDecimal;

/**
 * C-3 행정동 목록 — B1 동 카드. 평균 위험도 내림차순 정렬은 FE 몫.
 *
 * @param householdCount 세대 기준
 * @param avgRiskScore 건물 기준 평균 (세대 가중 아님)
 */
public record DongResponse(
    String dongCd,
    String dongNm,
    long householdCount,
    BigDecimal avgRiskScore,
    String avgRiskLevelCd) {}
