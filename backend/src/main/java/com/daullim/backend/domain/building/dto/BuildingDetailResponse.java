package com.daullim.backend.domain.building.dto;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * E-2 건물 상세 — 세대패널 대장 프리필 + 점검폼 헤더 + 위험 분석 근거.
 *
 * <p>{@code installDay}·{@code installYear}·{@code detectorModel}은 감지기 보급 통합 대장이 존재하지 않아 <b>전량
 * null</b>이다(확정 결정). {@code useAprDay} null은 대장 미등재이며 FE가 '미등재'로 분기한다(관악 0.4% · 임실 9.2% 실측).
 *
 * <p>{@code scoreVersion}은 키일 뿐이고 변환 파라미터(q01·q99·α·m·λ̄·β)는 {@code varchar(20)} 제약 때문에 {@code
 * seed/score_params.json}에 분리 보관한다. {@code lambdaI}·{@code rrI}는 화면 미사용이라 내리지 않는다.
 */
public record BuildingDetailResponse(
    long buildingId,
    String address,
    String houseTypeCd,
    int floorCount,
    int unitCount,
    String useAprDay,
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
    String scoreVersion,
    Instant computedAt) {}
