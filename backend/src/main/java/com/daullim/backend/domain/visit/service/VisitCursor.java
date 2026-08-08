package com.daullim.backend.domain.visit.service;

import com.daullim.backend.common.error.BusinessException;
import com.daullim.backend.common.error.ErrorCode;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.Base64;

/**
 * 방문 목록 커서 — {@code (visited_at DESC, visit_id DESC)} 복합이다.
 *
 * <p>큐 커서({@code QueueCursor})는 {@code order_key} 하나로 되지만 여기서는 안 된다. {@code order_key}는 전역 유일·연속이라
 * 값 하나가 행 하나를 특정하는 반면, {@code visited_at}은 같은 시각이 겹칠 수 있다 — 오프라인 재전송이 한꺼번에 들어오면 실제로 겹친다. 시각만으로 끊으면
 * 그 경계의 행이 두 페이지에 겹쳐 나오거나 통째로 빠진다. PK를 함께 실어 동점을 깬다.
 *
 * <p>클라이언트가 해석해 조작하지 못하도록 Base64로 감싼 불투명 문자열로 내린다.
 */
public final class VisitCursor {

  private static final String PREFIX = "visit:";
  private static final char SEPARATOR = '|';

  private VisitCursor() {}

  /** 커서가 가리키는 지점 — 이 행 <b>다음</b>부터 읽는다. */
  public record Position(Instant visitedAt, long visitId) {}

  public static String encode(Instant visitedAt, long visitId) {
    String raw = PREFIX + visitedAt + SEPARATOR + visitId;
    return Base64.getEncoder().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
  }

  /** 해석할 수 없는 커서는 400이다 — 조용히 첫 페이지로 되돌리면 클라이언트가 무한 루프에 빠진다. */
  public static Position decode(String cursor) {
    String decoded;
    try {
      decoded = new String(Base64.getDecoder().decode(cursor), StandardCharsets.UTF_8);
    } catch (IllegalArgumentException e) {
      throw invalid();
    }
    if (!decoded.startsWith(PREFIX)) {
      throw invalid();
    }
    String body = decoded.substring(PREFIX.length());
    int split = body.lastIndexOf(SEPARATOR);
    if (split < 0) {
      throw invalid();
    }
    try {
      return new Position(
          Instant.parse(body.substring(0, split)), Long.parseLong(body.substring(split + 1)));
    } catch (DateTimeParseException | NumberFormatException e) {
      throw invalid();
    }
  }

  private static BusinessException invalid() {
    return new BusinessException(ErrorCode.VALIDATION_ERROR, "cursor: 커서 형식이 올바르지 않습니다.");
  }
}
