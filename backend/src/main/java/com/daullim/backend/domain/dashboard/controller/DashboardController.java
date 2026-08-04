package com.daullim.backend.domain.dashboard.controller;

import com.daullim.backend.common.response.ApiResponse;
import com.daullim.backend.domain.dashboard.dto.DashboardSummaryResponse;
import com.daullim.backend.domain.dashboard.service.DashboardQueryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Pattern;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "관제", description = "관제 화면 하단 요약")
@RestController
@RequestMapping("/api/v1/dashboard")
@Validated
public class DashboardController {

  private final DashboardQueryService service;

  DashboardController(DashboardQueryService service) {
    this.service = service;
  }

  @Operation(summary = "관제 요약 조회", description = "sigunguCd를 생략하면 전 지역 집계다.")
  @GetMapping("/summary")
  public ApiResponse<DashboardSummaryResponse> summary(
      @RequestParam(required = false) @Pattern(regexp = "\\d{5}", message = "시군구코드는 5자리 숫자입니다.") String sigunguCd) {
    return ApiResponse.ok(service.summary(sigunguCd));
  }
}
