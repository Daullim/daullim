package com.daullim.backend.domain.visit.service;

import com.daullim.backend.common.error.BusinessException;
import com.daullim.backend.common.error.ErrorCode;
import com.daullim.backend.domain.code.service.CodeBook;
import com.daullim.backend.domain.code.service.CodeBookProvider;
import java.time.Clock;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;

/** 경보기 판정·처방 계산. */
@Service
public class JudgmentService {

  private final CodeBookProvider codeBooks;
  private final Clock clock;

  JudgmentService(CodeBookProvider codeBooks, Clock clock) {
    this.codeBooks = codeBooks;
    this.clock = clock;
  }

  public AlarmJudgment judge(VisitSubmission raw) {
    VisitSubmission s = raw.normalized();
    CodeBook cb = codeBooks.get();

    validateGate(s, cb);

    // 점검 수행 여부는 lookup이 정한다.
    if (!cb.consentStatus(s.consentCode()).isInspectable()) {
      return AlarmJudgment.notInspected();
    }

    validateAlarm(s, cb);

    String auto = autoReason(s);
    validatePostCare(s, "expired".equals(auto));
    int effective = auto != null ? s.roomCount() : s.replaceCount();

    List<ItemJudgment> items = auto != null ? autoItems(auto, effective, cb) : judgedItems(s, cb);
    String condition = overallCondition(auto, effective, items, cb);

    return new AlarmJudgment(
        true,
        s.roomCount().shortValue(),
        s.mfgYm(),
        s.mfgUnmarked(),
        // 전량 교체 확정 시엔 개수를 입력받지 않으므로 원입력을 그대로 둔다.
        s.replaceCount() == null ? null : s.replaceCount().shortValue(),
        "expired".equals(auto),
        (short) effective,
        condition,
        items,
        DetectorPolicy.RULE_VERSION);
  }

  /* ------------------------------- 검증 ------------------------------- */

  private void validateGate(VisitSubmission s, CodeBook cb) {
    if (s.consentCode() == null) {
      throw invalid("consentCode: 방문 승낙 상태는 필수입니다.");
    }
    cb.consentStatus(s.consentCode()); // 모르는 코드값이면 여기서 422
    if ("refused".equals(s.consentCode()) && s.refusalReasonCode() == null) {
      throw invalid("refusalReasonCode: 거부 사유는 필수입니다.");
    }
    // 세대가 큐에 남는지를 이 값 하나가 정한다 — 비승낙 방문에도 필수다.
    if (s.revisitPlanCode() == null) {
      throw invalid("revisitPlanCode: 재방문 필요 여부는 필수입니다.");
    }
  }

  /** 경과 세대를 큐에서 빼려면 근거를 남겨야 한다 (ck_v_norev). */
  private void validatePostCare(VisitSubmission s, boolean expired) {
    boolean droppedFromQueue =
        expired
            && "not-needed".equals(s.revisitPlanCode())
            && !"done".equals(s.rxDoneCode())
            && isBlank(s.noRevisitNote());
    if (droppedFromQueue) {
      throw invalid("noRevisitNote: 내용연수 경과 세대를 교체·재방문 없이 종료하려면 사유가 필요합니다.");
    }
  }

  private static boolean isBlank(String value) {
    return value == null || value.isBlank();
  }

  private void validateAlarm(VisitSubmission s, CodeBook cb) {
    if (s.respondentTypeCode() == null) {
      throw invalid("respondentTypeCode: 응대자 유형은 필수입니다.");
    }
    if (s.roomCount() == null || s.roomCount() < 1) {
      throw invalid("roomCount: 구획된 실 개수는 1 이상이어야 합니다.");
    }
    if (s.mfgYm() == null && !s.mfgUnmarked()) {
      throw invalid("mfgYm: 제조년월 실측 또는 '표기 없음' 중 하나는 필수입니다.");
    }
    if (s.extinguisherInstalledCode() == null) {
      throw invalid("extinguisherInstalledCode: 소화기 설치 여부는 필수입니다.");
    }

    // 전량 교체로 자동 확정된 건은 개수·사유를 입력받지 않는다.
    if (autoReason(s) != null) {
      return;
    }
    if (s.replaceCount() == null) {
      throw invalid("replaceCount: 교체 필요 개수는 필수입니다.");
    }
    if (s.replaceCount() < 0 || s.replaceCount() > s.roomCount()) {
      throw invalid("replaceCount: 교체 개수는 0 이상 구획된 실 개수 이하여야 합니다.");
    }
    if (s.replacements().size() != s.replaceCount()) {
      throw invalid(
          "replacements: 교체 개수(%d)와 사유 항목 수(%d)가 다릅니다."
              .formatted(s.replaceCount(), s.replacements().size()));
    }
    for (int i = 0; i < s.replacements().size(); i++) {
      validateItem(s.replacements().get(i), i, cb);
    }
  }

  private void validateItem(ReplacementInput item, int index, CodeBook cb) {
    if (item.replaceReasonCode() == null) {
      throw invalid("replacements[%d].replaceReasonCode: 교체 사유는 필수입니다.".formatted(index));
    }
    cb.replaceReason(item.replaceReasonCode()); // 모르는 코드값이면 422

    boolean batteryDead = "battery-dead".equals(item.replaceReasonCode());
    boolean appearance = "appearance".equals(item.replaceReasonCode());

    // ck_ri_battery는 양방향 제약
    if (batteryDead && item.batteryTypeCode() == null) {
      throw invalid("replacements[%d].batteryTypeCode: 방전은 전지 유형이 필요합니다.".formatted(index));
    }
    if (!batteryDead && item.batteryTypeCode() != null) {
      throw invalid("replacements[%d].batteryTypeCode: 방전이 아니면 전지 유형을 둘 수 없습니다.".formatted(index));
    }
    if (item.batteryTypeCode() != null) {
      cb.batteryType(item.batteryTypeCode());
    }

    // 외관 플래그는 DB 제약이 아예 없다
    if (appearance && item.detectorFlagCodes().isEmpty()) {
      throw invalid("replacements[%d].detectorFlagCodes: 외관이상은 세부 항목이 필요합니다.".formatted(index));
    }
    if (!appearance && !item.detectorFlagCodes().isEmpty()) {
      throw invalid(
          "replacements[%d].detectorFlagCodes: 외관이상이 아니면 세부 항목을 둘 수 없습니다.".formatted(index));
    }
    item.detectorFlagCodes().forEach(cb::detectorFlag);
  }

  /* ------------------------------- 판정 ------------------------------- */

  /**
   * 개수·사유 입력 없이 전량 교체가 확정되는 사유. 아니면 null.
   *
   * <p>경과는 연식이 다한 것이고 미표기는 연식을 보증할 수 없는 것이다. 둘 다 실별로 따질 여지가 없다. 제조년월이 없으면 경과 판정 자체가 불가능하므로 두 경우는
   * 배타적이다.
   */
  private String autoReason(VisitSubmission s) {
    if (s.mfgYm() != null) {
      return yearsSince(s.mfgYm()) >= DetectorPolicy.SERVICE_LIFE_YEARS ? "expired" : null;
    }
    return s.mfgUnmarked() ? "unmarked" : null;
  }

  private int yearsSince(String mfgYm) {
    YearMonth manufactured;
    try {
      manufactured = YearMonth.parse(mfgYm);
    } catch (DateTimeParseException e) {
      throw invalid("mfgYm: 제조년월은 YYYY-MM 형식이어야 합니다.");
    }
    long months = ChronoUnit.MONTHS.between(manufactured, YearMonth.now(clock));
    if (months < 0) {
      throw invalid("mfgYm: 제조년월이 미래입니다.");
    }
    return (int) (months / 12);
  }

  /** 사유를 하나로 고정해 실 개수만큼 자동 기록한다 — 집계 경로를 현장 입력과 하나로 맞춘다. */
  private List<ItemJudgment> autoItems(String reason, int count, CodeBook cb) {
    String rx = cb.replaceReason(reason).getRxCode();
    String condition = conditionOf(reason, Set.of(), cb);
    List<ItemJudgment> items = new ArrayList<>(count);
    for (int i = 0; i < count; i++) {
      items.add(new ItemJudgment((short) (i + 1), reason, null, Set.of(), rx, condition, true));
    }
    return items;
  }

  private List<ItemJudgment> judgedItems(VisitSubmission s, CodeBook cb) {
    List<ItemJudgment> items = new ArrayList<>(s.replacements().size());
    for (int i = 0; i < s.replacements().size(); i++) {
      ReplacementInput in = s.replacements().get(i);
      items.add(
          new ItemJudgment(
              (short) (i + 1),
              in.replaceReasonCode(),
              in.batteryTypeCode(),
              in.detectorFlagCodes(),
              rxOf(in, cb),
              conditionOf(in.replaceReasonCode(), in.detectorFlagCodes(), cb),
              false));
    }
    return items;
  }

  /**
   * 항목 1건의 판정.
   *
   * <p>이 사다리는 lookup 어디에도 컬럼이 없다 — 데이터가 아니라 로직이다. 고치지 말 것.
   */
  private String conditionOf(String reason, Set<String> flags, CodeBook cb) {
    return switch (reason) {
      case "expired" -> "EXPIRED";
      // 미표기는 연차를 논할 자격이 없는 건이라 EXPIRED가 아니라 DEFECTIVE로.
      case "battery-dead", "detached", "unmarked" -> "DEFECTIVE";
      case "appearance" ->
          flags.stream().anyMatch(f -> cb.detectorFlag(f).isSevere())
              ? "DEFECTIVE"
              : "REPLACE_ADVISED";
      default -> "REPLACE_ADVISED";
    };
  }

  /** 사유가 기준이되 방전만 전지 유형 — 일체형은 전지 교체가 불가해 기기 교체로 간다. */
  private String rxOf(ReplacementInput in, CodeBook cb) {
    if (!"battery-dead".equals(in.replaceReasonCode())) {
      return cb.replaceReason(in.replaceReasonCode()).getRxCode();
    }
    String overridden = cb.batteryType(in.batteryTypeCode()).getRxCode();
    // '모름'은 판별 전이라 처방이 없다 — 사유 기준값으로 폴백.
    return overridden != null ? overridden : cb.replaceReason("battery-dead").getRxCode();
  }

  /** 세대 종합 판정 = 항목 최악값. 서열은 lookup의 severity_rank가 정한다. */
  private String overallCondition(
      String auto, int effective, List<ItemJudgment> items, CodeBook cb) {
    if (effective == 0) {
      return "OK_GOOD";
    }
    if (auto != null) {
      return conditionOf(auto, Set.of(), cb);
    }
    return items.stream()
        .map(ItemJudgment::conditionCode)
        .max(Comparator.comparingInt(c -> cb.conditionCode(c).getSeverityRank()))
        .orElseThrow(() -> invalid("replacements: 교체 항목이 비어 있습니다."));
  }

  private static BusinessException invalid(String message) {
    return new BusinessException(ErrorCode.VALIDATION_ERROR, message);
  }
}
