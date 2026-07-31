package com.daullim.backend.domain.visit.service;

import java.util.Set;

/** 교체 대상 1건의 현장 원입력. */
public record ReplacementInput(
    String replaceReasonCode, String batteryTypeCode, Set<String> detectorFlagCodes) {

  public ReplacementInput {
    detectorFlagCodes = detectorFlagCodes == null ? Set.of() : Set.copyOf(detectorFlagCodes);
  }
}
