package com.daullim.backend.domain.building.dto;

import java.math.BigDecimal;

/**
 * E-1 큐 1행 — B3 QueueRow + 진행 표시와 1:1.
 *
 * <p>실데이터의 값은 명세 예시와 다르다. {@code basis}는 보급이력이 전량 NULL이라 {@code "미보급 · 동선 5407"} 형태이고, {@code
 * installDay}는 통합 대장이 없어 항상 null, {@code lastInspectedDay}는 첫 점검이 저장되기 전까지 null이다.
 *
 * <p>건물 완료는 {@code unitDoneCount == unitCount} 파생이며 저장하지 않는다(FE {@code isBuildingDone}과 같은 규칙).
 */
public record BuildingQueueItem(
    long buildingId,
    int orderKey,
    String address,
    String houseTypeCd,
    BigDecimal score,
    String riskLevelCd,
    boolean isEstimated,
    String basis,
    String rxCodeCd,
    BigDecimal lat,
    BigDecimal lng,
    String installDay,
    String lastInspectedDay,
    int unitCount,
    long unitDoneCount) {}
