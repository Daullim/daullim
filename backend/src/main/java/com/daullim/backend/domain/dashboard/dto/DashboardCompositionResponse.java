package com.daullim.backend.domain.dashboard.dto;

import java.math.BigDecimal;
import java.util.List;

/** 관제 위험 구성 집계 */
public record DashboardCompositionResponse(
    List<RiskLevelCount> byRiskLevel,
    List<RegionTypeRiskCount> byRegionType,
    List<HouseTypeCount> byHouseType,
    List<UseAprDecadeCount> byUseAprDecade,
    RrDistribution rrDistribution,
    long estimatedBuildingCount) {

  public record RiskLevelCount(String code, long buildingCount, long unitCount) {}

  public record RegionTypeRiskCount(String code, long danger, long warn, long ok) {}

  public record HouseTypeCount(String code, long buildingCount, long unitCount) {}

  public record UseAprDecadeCount(Integer decade, long buildingCount) {}

  public record RrDistribution(BigDecimal min, BigDecimal p50, BigDecimal p99, BigDecimal max) {}
}
