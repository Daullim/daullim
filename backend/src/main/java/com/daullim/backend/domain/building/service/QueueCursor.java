package com.daullim.backend.domain.building.service;

import com.daullim.backend.common.error.BusinessException;
import com.daullim.backend.common.error.ErrorCode;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

/** 큐 커서 — 정렬이 order_key 고정이라 커서도 그 값 하나 */
public final class QueueCursor {

  private static final String PREFIX = "order_key:";

  private QueueCursor() {}

  // 클라이언트 조작 방지를 위해 Base64로 감싼 불투명 문자열로 노출
  public static String encode(int orderKey) {
    return Base64.getEncoder().encodeToString((PREFIX + orderKey).getBytes(StandardCharsets.UTF_8));
  }

  /** 해석할 수 없는 커서는 400이다 — 조용히 첫 페이지로 되돌리면 클라이언트가 무한 루프에 빠진다. */
  public static int decode(String cursor) {
    String decoded;
    try {
      decoded = new String(Base64.getDecoder().decode(cursor), StandardCharsets.UTF_8);
    } catch (IllegalArgumentException e) {
      throw invalid();
    }
    if (!decoded.startsWith(PREFIX)) {
      throw invalid();
    }
    try {
      return Integer.parseInt(decoded.substring(PREFIX.length()));
    } catch (NumberFormatException e) {
      throw invalid();
    }
  }

  private static BusinessException invalid() {
    return new BusinessException(ErrorCode.VALIDATION_ERROR, "cursor: 커서 형식이 올바르지 않습니다.");
  }
}
