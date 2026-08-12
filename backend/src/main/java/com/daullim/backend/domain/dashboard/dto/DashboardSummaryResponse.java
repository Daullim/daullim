package com.daullim.backend.domain.dashboard.dto;

import java.time.Instant;
import java.util.Map;

/**
 * H-3 관제 요약 — 관제 5탭 공용 하단 카운터
 *
 * @param dangerCount 건물 기준 (targetCount·doneCount는 세대 기준)
 * @param pendingByRxCode 미완료 세대의 처방 코드별 수 — 0건 코드도 포함, 처방 없는 건물은 제외
 * @param computedAt 점수 산출 시각 (pipeline 월 1회) — 건물 없으면 null
 * @param updatedAt 조회 시점 시각 (저장값 아님)
 */
public record DashboardSummaryResponse(
    long targetCount,
    long doneCount,
    long dangerCount,
    Map<String, Long> pendingByRxCode,
    Instant computedAt,
    Instant updatedAt) {}
