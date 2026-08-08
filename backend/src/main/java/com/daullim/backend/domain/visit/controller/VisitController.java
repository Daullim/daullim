package com.daullim.backend.domain.visit.controller;

import com.daullim.backend.common.error.BusinessException;
import com.daullim.backend.common.error.ErrorCode;
import com.daullim.backend.common.response.ApiResponse;
import com.daullim.backend.common.response.CursorPage;
import com.daullim.backend.domain.visit.dto.VisitDayCount;
import com.daullim.backend.domain.visit.dto.VisitDetailResponse;
import com.daullim.backend.domain.visit.dto.VisitListItem;
import com.daullim.backend.domain.visit.dto.VisitSubmitRequest;
import com.daullim.backend.domain.visit.service.VisitQueryService;
import com.daullim.backend.domain.visit.service.VisitSaveResult;
import com.daullim.backend.domain.visit.service.VisitSubmissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 저장은 세대의 하위 경로에, 조회는 방문 자신의 경로에 건다.
 *
 * <p>저장은 드릴다운의 종착점이라 세대가 문맥이지만, 조회는 세대를 가로질러 날짜·점검원으로 찾는다.
 */
@Tag(name = "점검", description = "현장 점검 결과 저장과 기록 조회")
@RestController
@Validated
public class VisitController {

  private static final String IDEMPOTENCY_KEY = "Idempotency-Key";
  private static final int DEFAULT_SIZE = 20;

  /** 토큰의 주인을 가리키는 별칭 — 클라이언트가 자기 user_id를 몰라도 "내 기록"을 부를 수 있다. */
  private static final String ME = "me";

  private final VisitSubmissionService service;
  private final VisitQueryService queryService;

  VisitController(VisitSubmissionService service, VisitQueryService queryService) {
    this.service = service;
    this.queryService = queryService;
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

  @Operation(
      summary = "점검 기록 목록 조회",
      description =
          """
          visited_at 내림차순(최신 먼저). 커서는 (visited_at, visit_id) 복합이라 같은 시각이 겹쳐도
          페이지 경계가 흔들리지 않는다. officerId에 me를 주면 토큰의 주인으로 푼다.
          soft delete된 방문은 어느 경로로도 나오지 않는다.
          """)
  @GetMapping("/api/v1/visits")
  public ApiResponse<CursorPage<VisitListItem>> list(
      @RequestParam(required = false)
          @Pattern(regexp = "me|\\d+", message = "officerId는 me 또는 숫자입니다.") String officerId,
      @RequestParam(required = false) Long unitId,
      @RequestParam(required = false) @Pattern(regexp = "\\d{8}", message = "from은 YYYYMMDD입니다.") String from,
      @RequestParam(required = false) @Pattern(regexp = "\\d{8}", message = "to는 YYYYMMDD입니다.") String to,
      @RequestParam(required = false) String consentCd,
      @RequestParam(required = false) @Pattern(regexp = "\\d{10}", message = "행정동코드는 10자리 숫자입니다.") String dongCd,
      @RequestParam(required = false) String cursor,
      @RequestParam(required = false, defaultValue = "" + DEFAULT_SIZE)
          @Min(value = 1, message = "size는 1 이상입니다.") @Max(value = 100, message = "size는 100 이하입니다.") int size,
      @AuthenticationPrincipal Jwt jwt) {

    return ApiResponse.ok(
        queryService.list(
            filter(officerId, unitId, from, to, consentCd, dongCd, jwt), cursor, size));
  }

  @Operation(
      summary = "점검 기록 달력 집계",
      description =
          """
          일자별 건수. 목록은 커서로 잘려 오므로 "이 달에 기록이 있는 날"을 만들 수 없다 —
          첫 페이지만 보고 점을 찍으면 달력이 거짓말을 한다. 건수가 0인 날은 내리지 않는다.
          """)
  @GetMapping("/api/v1/visits/calendar")
  public ApiResponse<List<VisitDayCount>> calendar(
      @RequestParam(required = false)
          @Pattern(regexp = "me|\\d+", message = "officerId는 me 또는 숫자입니다.") String officerId,
      @RequestParam @Pattern(regexp = "\\d{8}", message = "from은 YYYYMMDD입니다.") String from,
      @RequestParam @Pattern(regexp = "\\d{8}", message = "to는 YYYYMMDD입니다.") String to,
      @RequestParam(required = false) String consentCd,
      @RequestParam(required = false) @Pattern(regexp = "\\d{10}", message = "행정동코드는 10자리 숫자입니다.") String dongCd,
      @AuthenticationPrincipal Jwt jwt) {

    return ApiResponse.ok(
        queryService.countByDay(filter(officerId, null, from, to, consentCd, dongCd, jwt)));
  }

  @Operation(summary = "점검 기록 상세 조회", description = "현장 원입력 + 서버가 계산한 판정 스냅샷 + 교체 항목(외관 세부 항목 포함).")
  @GetMapping("/api/v1/visits/{visitId}")
  public ApiResponse<VisitDetailResponse> detail(@PathVariable long visitId) {
    return ApiResponse.ok(queryService.detail(visitId));
  }

  /** {@code me}를 토큰의 주인으로 푼다. 나머지는 그대로 넘긴다. */
  private static VisitQueryService.VisitFilter filter(
      String officerId,
      Long unitId,
      String from,
      String to,
      String consentCd,
      String dongCd,
      Jwt jwt) {
    Long resolved =
        officerId == null
            ? null
            : ME.equals(officerId) ? Long.valueOf(jwt.getSubject()) : Long.valueOf(officerId);
    return new VisitQueryService.VisitFilter(resolved, unitId, from, to, consentCd, dongCd);
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
