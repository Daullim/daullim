package com.daullim.backend.domain.dashboard.dto;

import java.time.Instant;

/**
 * H-3 관제 요약 — 하단 카운터 3종 + 갱신 시각.
 *
 * <p>집계 단위는 <b>세대</b>다(화면 라벨이 "대상 가구"). {@code dangerCount}만 건물 기준이다 — 위험 등급이 건물 속성이라 그렇다.
 *
 * <p>{@code updatedAt}은 이 응답을 만든 시각이다. 큐가 저장물이 아니라 조회 시 파생이므로 "마지막 집계 시각"이 곧 응답 시각이다.
 */
public record DashboardSummaryResponse(
    long targetCount, long doneCount, long dangerCount, Instant updatedAt) {}
