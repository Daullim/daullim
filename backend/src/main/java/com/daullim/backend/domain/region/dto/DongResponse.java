package com.daullim.backend.domain.region.dto;

import java.math.BigDecimal;

/**
 * C-3 행정동 목록 — B1 동 카드 + 관제 ①③④ 동별 표
 *
 * <p>건물 축(buildingCount·dangerCount)과 세대 축(householdCount·doneUnitCount·pendingUnitCount)이 섞여 있음 —
 * 곱하거나 나누면 세대 많은 건물이 가중됨.
 *
 * @param avgRiskScore 건물 기준 평균 (세대 가중 아님)
 * @param avgRrI 상대위험도 평균 — 관제 ① 기본 정렬 키, 건물 없는 동은 null
 * @param pendingUnitCount 미완료 세대 — 진행률 잔량이자 관제 ④ 소요 수량
 */
public record DongResponse(
    String dongCd,
    String dongNm,
    long householdCount,
    BigDecimal avgRiskScore,
    String avgRiskLevelCd,
    long buildingCount,
    long dangerCount,
    BigDecimal avgRrI,
    long doneUnitCount,
    long pendingUnitCount) {}
