package com.daullim.backend.domain.building.dto;

import java.math.BigDecimal;

/** E-1 큐 1행 — B3 QueueRow + 진행 표시와 1:1 매핑 */
public record BuildingQueueItem(
    long buildingId,
    int orderKey,
    String address,
    String houseTypeCd,
    BigDecimal score,
    String riskLevelCd,
    boolean isEstimated,
    String basis, // 보급이력 전량 NULL — "미보급 · 동선 5407" 형태
    String rxCodeCd,
    BigDecimal lat,
    BigDecimal lng,
    String installDay, // 통합 대장 부재로 항상 null
    String lastInspectedDay, // 첫 점검 저장 전까지 null
    int unitCount,
    long unitDoneCount) {} // 완료 여부는 unitDoneCount == unitCount 파생(비저장, FE isBuildingDone과 동일)
