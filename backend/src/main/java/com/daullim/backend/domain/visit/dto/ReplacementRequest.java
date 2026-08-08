package com.daullim.backend.domain.visit.dto;

import com.daullim.backend.domain.visit.service.ReplacementInput;
import java.util.Set;

/**
 * 교체 대상 1건의 현장 원입력.
 *
 * <p>세 값 모두 lookup 테이블이 받는다 — 형식 검사를 여기 두지 않는다. 모르는 코드값은 {@code CodeBook}이 422로 돌려준다. 사유별 필수 조합
 * (방전↔전지 유형 · 외관이상↔세부 항목)은 {@code JudgmentService}가 400으로 잡는다.
 */
public record ReplacementRequest(
    String replaceReasonCd, String batteryTypeCd, Set<String> detectorFlagCds) {

  ReplacementInput toInput() {
    return new ReplacementInput(replaceReasonCd, batteryTypeCd, detectorFlagCds);
  }
}
