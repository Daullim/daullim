package com.daullim.backend.domain.building.dto;

import java.math.BigDecimal;
import java.time.Instant;

/** E-2 건물 상세 — 세대패널 대장 프리필 + 점검폼 헤더 + 위험 분석 근거 */
public record BuildingDetailResponse(
    long buildingId,
    String address,
    String houseTypeCd,
    int floorCount,
    int unitCount,
    String useAprDay, // null은 대장 미등재(FE '미등재' 분기)
    // installDay·installYear·detectorModel: 감지기 보급 통합 대장 부재로 전량 null(확정 결정)
    String installDay,
    Integer installYear,
    String detectorModel,
    BigDecimal lat,
    BigDecimal lng,
    BigDecimal score,
    String riskLevelCd,
    String rxCodeCd,
    boolean isEstimated,
    boolean isExplore,
    String basis,
    String scoreVersion, // 변환 파라미터(q01·q99·α·m·λ̄·β)는 seed/score_params.json에 분리 보관
    Instant computedAt) {} // lambdaI·rrI는 화면 미사용이라 미포함
