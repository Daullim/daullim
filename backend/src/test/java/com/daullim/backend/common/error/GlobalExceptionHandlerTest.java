package com.daullim.backend.common.error;

import static org.assertj.core.api.Assertions.assertThat;

import com.daullim.backend.common.response.ApiResponse;
import jakarta.persistence.EntityNotFoundException;
import java.sql.SQLException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import tools.jackson.databind.json.JsonMapper;

class GlobalExceptionHandlerTest {

  private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

  @Test
  @DisplayName("BusinessException은 ErrorCode가 정한 상태코드와 이름으로 나간다")
  void businessExceptionUsesErrorCode() {
    ResponseEntity<ApiResponse<Void>> res =
        handler.handleBusiness(new BusinessException(ErrorCode.NOT_FOUND, "세대를 찾을 수 없습니다."));

    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    assertThat(res.getBody().code()).isEqualTo("NOT_FOUND");
    assertThat(res.getBody().message()).isEqualTo("세대를 찾을 수 없습니다.");
    assertThat(res.getBody().data()).isNull();
  }

  @Test
  @DisplayName("UNIQUE 위반은 409로 나간다")
  void uniqueViolationIsConflict() {
    assertThat(handler.handleDataIntegrity(violation("23505")).getStatusCode())
        .isEqualTo(HttpStatus.CONFLICT);
  }

  @Test
  @DisplayName("FK·CHECK 위반은 422 DOMAIN_CODE_INVALID로 나간다")
  void fkAndCheckViolationAreDomainCodeInvalid() {
    for (String sqlState : new String[] {"23503", "23514"}) {
      ResponseEntity<ApiResponse<Void>> res = handler.handleDataIntegrity(violation(sqlState));
      assertThat(res.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_CONTENT);
      assertThat(res.getBody().code()).isEqualTo("DOMAIN_CODE_INVALID");
    }
  }

  @Test
  @DisplayName("분류되지 않은 무결성 위반은 500으로 떨어진다")
  void unknownIntegrityViolationIsInternalError() {
    assertThat(handler.handleDataIntegrity(violation("42P01")).getStatusCode())
        .isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
  }

  @Test
  @DisplayName("EntityNotFound는 404로 나간다")
  void entityNotFoundIs404() {
    assertThat(handler.handleNotFound(new EntityNotFoundException("no row")).getStatusCode())
        .isEqualTo(HttpStatus.NOT_FOUND);
  }

  @Test
  @DisplayName("예상 못 한 예외는 원인 메시지를 노출하지 않는다")
  void unexpectedErrorHidesCause() {
    ResponseEntity<ApiResponse<Void>> res =
        handler.handleUnexpected(new IllegalStateException("jdbc://user:password@host"));

    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
    assertThat(res.getBody().message()).isEqualTo(ErrorCode.INTERNAL_ERROR.getMessage());
  }

  @Test
  @DisplayName("봉투는 성공이든 실패든 code·message·data 세 키를 모두 내보낸다")
  void envelopeAlwaysHasThreeKeys() {
    JsonMapper mapper = JsonMapper.builder().build();

    assertThat(mapper.writeValueAsString(ApiResponse.ok()))
        .contains("\"code\":\"SUCCESS\"", "\"data\":null");
    assertThat(mapper.writeValueAsString(ApiResponse.error(ErrorCode.UNAUTHORIZED)))
        .contains("\"code\":\"UNAUTHORIZED\"", "\"data\":null");
  }

  private static DataIntegrityViolationException violation(String sqlState) {
    return new DataIntegrityViolationException("wrapped", new SQLException("detail", sqlState));
  }
}
