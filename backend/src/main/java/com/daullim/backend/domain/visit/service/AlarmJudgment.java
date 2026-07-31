package com.daullim.backend.domain.visit.service;

import java.util.List;

/** 경보기 판정 스냅샷. 비승낙 방문은 모든 필드가 null. */
public record AlarmJudgment(
    boolean inspected,
    Short roomCount,
    String mfgYm,
    boolean mfgUnmarked,
    Short replaceCount,
    Boolean expired,
    Short effectiveReplaceCount,
    String conditionCode,
    List<ItemJudgment> items,
    String ruleVersion) {

  public AlarmJudgment {
    items = items == null ? List.of() : List.copyOf(items);
  }

  static AlarmJudgment notInspected() {
    return new AlarmJudgment(
        false, null, null, false, null, null, null, null, List.of(), DetectorPolicy.RULE_VERSION);
  }
}
