package com.daullim.backend.domain.code.service;

import com.daullim.backend.domain.code.entity.AgeBand;
import com.daullim.backend.domain.code.entity.BatteryType;
import com.daullim.backend.domain.code.entity.ConditionCode;
import com.daullim.backend.domain.code.entity.ConsentStatus;
import com.daullim.backend.domain.code.entity.DetectorFlag;
import com.daullim.backend.domain.code.entity.ReplaceReason;
import com.daullim.backend.domain.code.entity.UnitStatus;
import com.daullim.backend.domain.code.repository.AgeBandRepository;
import com.daullim.backend.domain.code.repository.BatteryTypeRepository;
import com.daullim.backend.domain.code.repository.ConditionCodeRepository;
import com.daullim.backend.domain.code.repository.ConsentStatusRepository;
import com.daullim.backend.domain.code.repository.DetectorFlagRepository;
import com.daullim.backend.domain.code.repository.ReplaceReasonRepository;
import com.daullim.backend.domain.code.repository.UnitStatusRepository;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class CodeBookProvider {

  private final ReplaceReasonRepository replaceReasons;
  private final BatteryTypeRepository batteryTypes;
  private final DetectorFlagRepository detectorFlags;
  private final ConditionCodeRepository conditionCodes;
  private final AgeBandRepository ageBands;
  private final UnitStatusRepository unitStatuses;
  private final ConsentStatusRepository consentStatuses;

  private volatile CodeBook cached;

  CodeBookProvider(
      ReplaceReasonRepository replaceReasons,
      BatteryTypeRepository batteryTypes,
      DetectorFlagRepository detectorFlags,
      ConditionCodeRepository conditionCodes,
      AgeBandRepository ageBands,
      UnitStatusRepository unitStatuses,
      ConsentStatusRepository consentStatuses) {
    this.replaceReasons = replaceReasons;
    this.batteryTypes = batteryTypes;
    this.detectorFlags = detectorFlags;
    this.conditionCodes = conditionCodes;
    this.ageBands = ageBands;
    this.unitStatuses = unitStatuses;
    this.consentStatuses = consentStatuses;
  }

  /** Flyway가 끝난 뒤에 읽어야 하므로 빈 생성 시점이 아니라 기동 완료 시점에 채움. */
  @EventListener(ApplicationReadyEvent.class)
  void warmUp() {
    this.cached = read();
  }

  public CodeBook get() {
    CodeBook snapshot = this.cached;
    if (snapshot == null) {
      snapshot = read();
      this.cached = snapshot;
    }
    return snapshot;
  }

  private CodeBook read() {
    return new CodeBook(
        index(replaceReasons.findAll(), ReplaceReason::getCode),
        index(batteryTypes.findAll(), BatteryType::getCode),
        index(detectorFlags.findAll(), DetectorFlag::getCode),
        index(conditionCodes.findAll(), ConditionCode::getCode),
        index(ageBands.findAll(), AgeBand::getCode),
        index(unitStatuses.findAll(), UnitStatus::getCode),
        index(consentStatuses.findAll(), ConsentStatus::getCode));
  }

  private static <T> java.util.Map<String, T> index(List<T> rows, Function<T, String> key) {
    return rows.stream().collect(Collectors.toUnmodifiableMap(key, Function.identity()));
  }
}
