package com.daullim.backend.domain.grid.dto;

/**
 * D-3 격자 방문 현황 — B2 리스트의 실시간 부분만 담는다. 정적 속성은 GeoJSON에 있고 FE가 {@code gridId}로 조인한다.
 *
 * <p>{@code gridId}는 <b>1km</b>다({@code 다사4641}). DB의 {@code buildings.grid_id}는 500m라 서버가 유도해 내린다
 * — 그대로 조인하면 0건이 된다.
 *
 * <p>{@code visitedCount}는 전 세대가 완료된 건물 수다(건물 완료 파생).
 */
public record GridSummaryItem(String gridId, long targetCount, long visitedCount) {}
