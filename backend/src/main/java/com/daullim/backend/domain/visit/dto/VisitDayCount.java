package com.daullim.backend.domain.visit.dto;

/**
 * 달력 마킹용 일자별 건수.
 *
 * <p>목록({@code GET /visits})은 커서로 잘려 오므로 "이 달에 기록이 있는 날"을 만들 수 없다 — 첫 페이지만 보고 점을 찍으면 달력이 거짓말을 한다.
 * 집계는 {@code GROUP BY visited_day} 한 번으로 따로 낸다.
 *
 * <p>건수가 0인 날은 내리지 않는다 — 화면이 필요로 하는 것은 "찍을 날"의 목록이다.
 */
public record VisitDayCount(String day, long count) {}
