package com.daullim.backend.domain.grid.dto;

/**
 * D-3 격자 방문 현황 — B2 리스트의 실시간 부분만 담는다. 정적 속성은 GeoJSON에 있고 FE가 {@code gridId}로 조인한다.
 *
 * @param gridId 1km 격자 코드 (DB는 500m, 서버가 유도)
 * @param visitedCount 전 세대 완료된 건물 수
 */
public record GridSummaryItem(String gridId, long targetCount, long visitedCount) {}
