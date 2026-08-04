package com.daullim.backend.domain.region.dto;

import java.math.BigDecimal;

/**
 * C-3 행정동 목록 — B1 동 카드.
 *
 * <p>명칭은 사전에서, 집계는 DB에서 온다. 평균 위험도 내림차순 정렬은 FE 몫이다.
 *
 * <p>{@code householdCount}는 <b>세대</b> 수이고 {@code avgRiskScore}는 <b>건물</b> 평균이다 — 축이 다르다. 위험 점수가 건물
 * 속성이라 세대로 평균 내면 세대 많은 건물이 가중된다.
 */
public record DongResponse(
    String dongCd,
    String dongNm,
    long householdCount,
    BigDecimal avgRiskScore,
    String avgRiskLevelCd) {}
