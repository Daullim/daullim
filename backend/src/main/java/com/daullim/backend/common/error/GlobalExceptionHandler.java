package com.daullim.backend.common.error;

import com.daullim.backend.common.response.ApiResponse;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.ConstraintViolationException;
import java.sql.SQLException;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  private static final String UNIQUE_VIOLATION = "23505";
  private static final String FK_VIOLATION = "23503";
  private static final String CHECK_VIOLATION = "23514";

  @ExceptionHandler(BusinessException.class)
  public ResponseEntity<ApiResponse<Void>> handleBusiness(BusinessException e) {
    log.warn("business error: {} - {}", e.getErrorCode(), e.getMessage());
    return toResponse(e.getErrorCode(), e.getMessage());
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiResponse<Void>> handleInvalidArgument(
      MethodArgumentNotValidException e) {
    String detail =
        e.getBindingResult().getFieldErrors().stream()
            .map(f -> f.getField() + ": " + f.getDefaultMessage())
            .collect(Collectors.joining(", "));
    log.warn("validation failed - {}", detail);
    return toResponse(ErrorCode.VALIDATION_ERROR, detail);
  }

  @ExceptionHandler(ConstraintViolationException.class)
  public ResponseEntity<ApiResponse<Void>> handleConstraintViolation(
      ConstraintViolationException e) {
    String detail =
        e.getConstraintViolations().stream()
            .map(v -> v.getPropertyPath() + ": " + v.getMessage())
            .collect(Collectors.joining(", "));
    log.warn("validation failed - {}", detail);
    return toResponse(ErrorCode.VALIDATION_ERROR, detail);
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<ApiResponse<Void>> handleUnreadableBody(HttpMessageNotReadableException e) {
    log.warn("unreadable request body - {}", e.getMessage());
    return toResponse(ErrorCode.VALIDATION_ERROR, ErrorCode.VALIDATION_ERROR.getMessage());
  }

  @ExceptionHandler(EntityNotFoundException.class)
  public ResponseEntity<ApiResponse<Void>> handleNotFound(EntityNotFoundException e) {
    log.warn("entity not found - {}", e.getMessage());
    return toResponse(ErrorCode.NOT_FOUND, ErrorCode.NOT_FOUND.getMessage());
  }

  /** 매핑되지 않은 URL 처리. */
  @ExceptionHandler(NoResourceFoundException.class)
  public ResponseEntity<ApiResponse<Void>> handleNoResource(NoResourceFoundException e) {
    log.warn("no handler for {}", e.getResourcePath());
    return toResponse(ErrorCode.NOT_FOUND, ErrorCode.NOT_FOUND.getMessage());
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  public ResponseEntity<ApiResponse<Void>> handleDataIntegrity(DataIntegrityViolationException e) {
    String sqlState = findSqlState(e);
    if (UNIQUE_VIOLATION.equals(sqlState)) {
      log.warn("unique violation - {}", e.getMostSpecificCause().getMessage());
      return toResponse(ErrorCode.CONFLICT, ErrorCode.CONFLICT.getMessage());
    }
    if (FK_VIOLATION.equals(sqlState) || CHECK_VIOLATION.equals(sqlState)) {
      log.error("domain constraint violation - {}", e.getMostSpecificCause().getMessage());
      return toResponse(ErrorCode.DOMAIN_CODE_INVALID, ErrorCode.DOMAIN_CODE_INVALID.getMessage());
    }
    log.error("data integrity violation", e);
    return toResponse(ErrorCode.INTERNAL_ERROR, ErrorCode.INTERNAL_ERROR.getMessage());
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiResponse<Void>> handleUnexpected(Exception e) {
    log.error("unexpected error", e);
    return toResponse(ErrorCode.INTERNAL_ERROR, ErrorCode.INTERNAL_ERROR.getMessage());
  }

  private static ResponseEntity<ApiResponse<Void>> toResponse(ErrorCode code, String message) {
    return ResponseEntity.status(code.getStatus()).body(ApiResponse.error(code, message));
  }

  private static String findSqlState(Throwable e) {
    for (Throwable t = e; t != null; t = t.getCause()) {
      if (t instanceof SQLException sql) {
        return sql.getSQLState();
      }
    }
    return null;
  }
}
