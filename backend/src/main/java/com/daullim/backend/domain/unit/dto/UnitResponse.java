package com.daullim.backend.domain.unit.dto;

import com.daullim.backend.domain.unit.entity.Unit;

/**
 * F-1 세대 1행 — UnitPanel 라디오 목록과 1:1.
 *
 * <p>{@code hoNm} null은 미지정이다(다가구는 전유부가 없어 호수를 현장에서 받는다). {@code hoNmSourceCd='field'}인 행만 F-2로 수정할
 * 수 있다.
 */
public record UnitResponse(
    long unitId,
    short unitSeq,
    String hoNm,
    Short flrNo,
    String hoNmSourceCd,
    String statusCd,
    String lastInspectedDay) {

  public static UnitResponse from(Unit unit) {
    return new UnitResponse(
        unit.getId(),
        unit.getUnitSeq(),
        unit.getHoNm(),
        unit.getFloorNo(),
        unit.getHoNmSourceCode(),
        unit.getStatusCode(),
        unit.getLastInspectedDay());
  }
}
