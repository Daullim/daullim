package com.daullim.backend.domain.visit.controller;

import com.daullim.backend.common.error.BusinessException;
import com.daullim.backend.common.error.ErrorCode;
import com.daullim.backend.common.response.ApiResponse;
import com.daullim.backend.domain.visit.dto.VisitSubmitRequest;
import com.daullim.backend.domain.visit.service.VisitSaveResult;
import com.daullim.backend.domain.visit.service.VisitSubmissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

/** 방문은 세대의 하위 리소스다 — 드릴다운의 종착점이 그대로 경로가 된다. */
@Tag(name = "점검", description = "현장 점검 결과 저장")
@RestController
public class VisitController {

  private static final String IDEMPOTENCY_KEY = "Idempotency-Key";

  private final VisitSubmissionService service;

  VisitController(VisitSubmissionService service) {
    this.service = service;
  }

  @Operation(
      summary = "점검 결과 저장",
      description =
          """
          원입력만 받는다 — 판정·처방·실효 교체 개수는 서버가 다시 계산한다. 점검원은 JWT의 sub에서 꺼낸다.
          Idempotency-Key를 실으면 재전송이 새 방문을 만들지 않고 기존 결과를 200으로 돌려준다.
          """)
  @PostMapping("/api/v1/units/{unitId}/visits")
  public ResponseEntity<ApiResponse<VisitSaveResult>> submit(
      @PathVariable long unitId,
      @RequestHeader(name = IDEMPOTENCY_KEY, required = false) String idempotencyKey,
      @RequestBody @Valid VisitSubmitRequest request,
      @AuthenticationPrincipal Jwt jwt) {

    VisitSaveResult result =
        service.submit(
            request.toSubmission(
                unitId, Long.valueOf(jwt.getSubject()), clientVisitId(idempotencyKey)));

    // 이미 저장된 건을 다시 받은 것이라 새로 만들어진 리소스가 없다.
    return ResponseEntity.status(result.replay() ? HttpStatus.OK : HttpStatus.CREATED)
        .body(ApiResponse.ok(result));
  }

  /** 형식이 틀린 키는 되받아야 한다 — 조용히 무시하면 재전송이 중복 저장이 된다. */
  private static UUID clientVisitId(String header) {
    if (header == null || header.isBlank()) {
      return null;
    }
    try {
      return UUID.fromString(header.trim());
    } catch (IllegalArgumentException e) {
      throw new BusinessException(
          ErrorCode.VALIDATION_ERROR, IDEMPOTENCY_KEY + ": UUID 형식이어야 합니다.");
    }
  }
}
