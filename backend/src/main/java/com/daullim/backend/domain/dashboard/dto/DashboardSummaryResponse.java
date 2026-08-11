package com.daullim.backend.domain.dashboard.dto;

import java.time.Instant;

/**
 * H-3 관제 요약 — 하단 카운터 3종 + 갱신 시각
 *
 * @param dangerCount 건물 기준 (targetCount·doneCount는 세대 기준)
 * @param updatedAt 조회 시점 시각 (저장값 아님)
 */
public record DashboardSummaryResponse(
    long targetCount, long doneCount, long dangerCount, Instant updatedAt) {}
