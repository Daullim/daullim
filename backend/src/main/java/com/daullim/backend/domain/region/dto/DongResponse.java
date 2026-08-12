package com.daullim.backend.domain.region.dto;

import java.math.BigDecimal;

/**
 * C-3 행정동 목록 — B1 동 카드 + 관제 ①③ 동별 표
 *
 * <p>건물 축(buildingCount·dangerCount)과 세대 축(householdCount·doneUnitCount·pendingUnitCount)이 섞여 있음 —
 * 곱하거나 나누면 세대 많은 건물이 가중됨.
 *
 * @param avgRiskScore 건물 기준 평균 (세대 가중 아님)
 * @param avgRrI 상대위험도 평균 — 관제 ① 기본 정렬 키, 건물 없는 동은 null
 * @param doneUnitCount 방문 기록 또는 세대 방문 캐시 있음
 * @param pendingUnitCount 미방문 세대
 * @param replacementUsedCount 실제 교체 사용 개수 누적
 * @param revisitPendingUnitCount 최신 방문 기준 재방문 대기 세대
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
    long pendingUnitCount,
    long replacementUsedCount,
    long revisitPendingUnitCount) {}
