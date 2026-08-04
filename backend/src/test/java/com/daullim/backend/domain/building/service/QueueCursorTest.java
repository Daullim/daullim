package com.daullim.backend.domain.building.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.daullim.backend.common.error.BusinessException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class QueueCursorTest {

  @Test
  @DisplayName("커서는 order_key를 감싼 Base64 불투명 문자열이다")
  void encodesOrderKey() {
    assertThat(QueueCursor.encode(4)).isEqualTo("b3JkZXJfa2V5OjQ=");
  }

  @Test
  @DisplayName("발급한 커서를 그대로 되읽는다")
  void roundTrips() {
    assertThat(QueueCursor.decode(QueueCursor.encode(30593))).isEqualTo(30593);
  }

  @Test
  @DisplayName("해석할 수 없는 커서는 400이다")
  void rejectsBrokenCursor() {
    assertThatThrownBy(() -> QueueCursor.decode("!!not-base64!!"))
        .isInstanceOf(BusinessException.class);
    // Base64로는 풀리지만 우리 커서가 아닌 값
    assertThatThrownBy(() -> QueueCursor.decode("aGVsbG8=")).isInstanceOf(BusinessException.class);
    assertThatThrownBy(() -> QueueCursor.decode("b3JkZXJfa2V5OngK"))
        .isInstanceOf(BusinessException.class);
  }
}
