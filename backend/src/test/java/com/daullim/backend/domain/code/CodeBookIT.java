package com.daullim.backend.domain.code;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.daullim.backend.TestcontainersConfiguration;
import com.daullim.backend.common.error.BusinessException;
import com.daullim.backend.common.error.ErrorCode;
import com.daullim.backend.domain.code.service.CodeBook;
import com.daullim.backend.domain.code.service.CodeBookProvider;
import java.time.Clock;
import java.time.ZoneId;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class CodeBookIT {

  @Autowired CodeBookProvider provider;
  @Autowired Clock clock;

  @Test
  @DisplayName("lookup 6종이 한 스냅샷에 다 담긴다")
  void loadsAllSevenLookups() {
    CodeBook book = provider.get();

    assertThat(book.replaceReasons()).hasSize(6);
    assertThat(book.batteryTypes()).hasSize(3);
    assertThat(book.detectorFlags()).hasSize(4);
    assertThat(book.conditionCodes()).hasSize(4);
    assertThat(book.unitStatuses()).hasSize(3);
    assertThat(book.consentStatuses()).hasSize(4);
  }

  @Test
  @DisplayName("판정이 참조하는 속성을 코드로 꺼낼 수 있다")
  void exposesJudgementAttributes() {
    CodeBook book = provider.get();

    assertThat(book.detectorFlag("cover-damage").isSevere()).isTrue();
    assertThat(book.detectorFlag("stain").isSevere()).isFalse();
    assertThat(book.conditionCode("DEFECTIVE").getSeverityRank()).isEqualTo((short) 3);
    assertThat(book.batteryType("sealed").getRxCode()).isEqualTo("RX-IOT");
    assertThat(book.replaceReason("expired").getRxCode()).isEqualTo("RX-IOT");
    assertThat(book.consentStatus("accepted").getUnitStatusCode()).isEqualTo("done");
  }

  @Test
  @DisplayName("모르는 코드값은 클라이언트 입력 오류가 아니라 드리프트 신호로 떨어진다")
  void unknownCodeIsDomainCodeInvalid() {
    CodeBook book = provider.get();

    assertThatThrownBy(() -> book.replaceReason("no-such-reason"))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("replace_reason_cd=no-such-reason")
        .extracting(e -> ((BusinessException) e).getErrorCode())
        .isEqualTo(ErrorCode.DOMAIN_CODE_INVALID);
  }

  @Test
  @DisplayName("시계는 KST로 고정돼 있다")
  void clockIsKst() {
    assertThat(clock.getZone()).isEqualTo(ZoneId.of("Asia/Seoul"));
  }
}
