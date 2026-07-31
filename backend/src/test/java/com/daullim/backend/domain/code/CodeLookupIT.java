package com.daullim.backend.domain.code;

import static org.assertj.core.api.Assertions.assertThat;

import com.daullim.backend.TestcontainersConfiguration;
import com.daullim.backend.domain.code.repository.BatteryTypeRepository;
import com.daullim.backend.domain.code.repository.ConditionCodeRepository;
import com.daullim.backend.domain.code.repository.ConsentStatusRepository;
import com.daullim.backend.domain.code.repository.DetectorFlagRepository;
import com.daullim.backend.domain.code.repository.ReplaceReasonRepository;
import com.daullim.backend.domain.code.repository.UnitStatusRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

/**
 * lookup seed가 frontend/src/config/domain.ts와 어긋나지 않는지 확인한다. 판정 서비스가 이 값들을 DB에서 읽어 동작하므로, 여기서 깨지면
 * 판정 결과가 통째로 틀린다.
 *
 * <p>이 테스트가 기동한다는 것 자체가 ddl-auto=validate 통과의 증거이기도 하다.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
class CodeLookupIT {

  @Autowired ReplaceReasonRepository replaceReasons;
  @Autowired BatteryTypeRepository batteryTypes;
  @Autowired DetectorFlagRepository detectorFlags;
  @Autowired ConditionCodeRepository conditionCodes;
  @Autowired UnitStatusRepository unitStatuses;
  @Autowired ConsentStatusRepository consentStatuses;

  @Test
  @DisplayName("lookup 6종의 행수가 domain.ts 열거값 개수와 일치한다")
  void seedRowCounts() {
    assertThat(replaceReasons.findAll()).hasSize(6);
    assertThat(batteryTypes.findAll()).hasSize(3);
    assertThat(detectorFlags.findAll()).hasSize(4);
    assertThat(conditionCodes.findAll()).hasSize(4);
    assertThat(unitStatuses.findAll()).hasSize(3);
    assertThat(consentStatuses.findAll()).hasSize(4);
  }

  @Test
  @DisplayName("처방 코드가 REPLACE_REASON·BATTERY_TYPE의 rx와 같다")
  void rxCodes() {
    assertThat(replaceReasons.findById("expired")).get().extracting("rxCode").isEqualTo("RX-IOT");
    assertThat(replaceReasons.findById("battery-dead"))
        .get()
        .extracting("rxCode")
        .isEqualTo("RX-BAT");
    assertThat(replaceReasons.findById("unmarked")).get().extracting("rxCode").isEqualTo("RX-IOT");
    assertThat(replaceReasons.findById("etc")).get().extracting("rxCode").isNull();

    // 일체형 방전은 전지 교체가 불가해 RX-IOT로 뒤집힌다
    assertThat(batteryTypes.findById("sealed")).get().extracting("rxCode").isEqualTo("RX-IOT");
    assertThat(batteryTypes.findById("replaceable")).get().extracting("rxCode").isEqualTo("RX-BAT");
    // '모름'은 판별 전이라 처방을 확정하지 못한다
    assertThat(batteryTypes.findById("unknown")).get().extracting("rxCode").isNull();
  }

  @Test
  @DisplayName("중대결함 플래그는 cover-damage 하나뿐이다")
  void severeFlag() {
    assertThat(detectorFlags.findAll())
        .filteredOn(f -> f.isSevere())
        .extracting("code")
        .containsExactly("cover-damage");
  }

  @Test
  @DisplayName("판정 심각도 서열이 CODE_RANK와 같다")
  void severityRanks() {
    assertThat(conditionCodes.findById("OK_GOOD"))
        .get()
        .extracting("severityRank")
        .isEqualTo((short) 0);
    assertThat(conditionCodes.findById("REPLACE_ADVISED"))
        .get()
        .extracting("severityRank")
        .isEqualTo((short) 1);
    assertThat(conditionCodes.findById("EXPIRED"))
        .get()
        .extracting("severityRank")
        .isEqualTo((short) 2);
    assertThat(conditionCodes.findById("DEFECTIVE"))
        .get()
        .extracting("severityRank")
        .isEqualTo((short) 3);
  }

  @Test
  @DisplayName("게이트→세대 상태 전이표가 CONSENT_TO_UNIT_STATUS와 같다")
  void consentToUnitStatus() {
    assertThat(consentStatuses.findById("accepted"))
        .get()
        .extracting("inspectable", "unitStatusCode")
        .containsExactly(true, "done");
    // 공가·연락두절을 '거부'로 묶는 것은 표시 편의일 뿐 의미 합의가 아니다
    assertThat(consentStatuses.findById("refused"))
        .get()
        .extracting("inspectable", "unitStatusCode")
        .containsExactly(false, "refused");
    assertThat(consentStatuses.findById("vacant"))
        .get()
        .extracting("inspectable", "unitStatusCode")
        .containsExactly(false, "refused");
    assertThat(consentStatuses.findById("unreachable"))
        .get()
        .extracting("inspectable", "unitStatusCode")
        .containsExactly(false, "refused");
  }

  @Test
  @DisplayName("종료 상태는 done 하나뿐이다")
  void terminalStatus() {
    assertThat(unitStatuses.findAll())
        .filteredOn(s -> s.isTerminal())
        .extracting("code")
        .containsExactly("done");
  }
}
