package com.daullim.backend.domain.code.service;

import com.daullim.backend.common.error.BusinessException;
import com.daullim.backend.common.error.ErrorCode;
import com.daullim.backend.domain.code.entity.BatteryType;
import com.daullim.backend.domain.code.entity.ConditionCode;
import com.daullim.backend.domain.code.entity.ConsentStatus;
import com.daullim.backend.domain.code.entity.DetectorFlag;
import com.daullim.backend.domain.code.entity.ReplaceReason;
import com.daullim.backend.domain.code.entity.UnitStatus;
import java.util.Map;

/** lookup 6종의 읽기 전용 스냅샷. 판정 규칙이 참조하는 속성(중대결함 여부·심각도 서열·처방 코드·상태 전이). */
public record CodeBook(
    Map<String, ReplaceReason> replaceReasons,
    Map<String, BatteryType> batteryTypes,
    Map<String, DetectorFlag> detectorFlags,
    Map<String, ConditionCode> conditionCodes,
    Map<String, UnitStatus> unitStatuses,
    Map<String, ConsentStatus> consentStatuses) {

  public ReplaceReason replaceReason(String code) {
    return require(replaceReasons.get(code), "replace_reason_cd", code);
  }

  public BatteryType batteryType(String code) {
    return require(batteryTypes.get(code), "battery_type_cd", code);
  }

  public DetectorFlag detectorFlag(String code) {
    return require(detectorFlags.get(code), "detector_flag_cd", code);
  }

  public ConditionCode conditionCode(String code) {
    return require(conditionCodes.get(code), "condition_code_cd", code);
  }

  public UnitStatus unitStatus(String code) {
    return require(unitStatuses.get(code), "unit_status_cd", code);
  }

  public ConsentStatus consentStatus(String code) {
    return require(consentStatuses.get(code), "consent_cd", code);
  }

  private static <T> T require(T found, String column, String code) {
    if (found == null) {
      throw new BusinessException(ErrorCode.DOMAIN_CODE_INVALID, column + "=" + code);
    }
    return found;
  }
}
