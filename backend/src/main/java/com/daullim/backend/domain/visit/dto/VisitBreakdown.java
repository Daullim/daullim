package com.daullim.backend.domain.visit.dto;

import java.util.List;

/**
 * 관제 3. 추진 현황 · 4. 소요 물량이 나눠 쓰는 축별 분해
 *
 * <p>{@code period}와 {@code current}를 가르는 이유 — 판정·거부 사유는 "그 기간에 무슨 일이 있었나"이고 재방문 대기는 "지금 얼마나 밀려
 * 있나"다. 한 덩어리로 내리면 화면이 잔량에도 기간 라벨을 붙여 거짓말을 한다.
 */
public record VisitBreakdown(Period period, Current current) {

  /**
   * @param byRxCode 방문 건수가 아니라 **자재 대수** — 한 방문이 여러 항목을 낳는다
   */
  public record Period(
      String from,
      String to,
      List<CodeCount> byConditionCode,
      List<CodeCount> byRefusalReason,
      List<CodeCount> byRxCode) {}

  public record Current(long revisitPendingUnitCount) {}
}
