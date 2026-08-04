package com.daullim.backend.domain.region.controller;

import com.daullim.backend.common.response.ApiResponse;
import com.daullim.backend.domain.region.dto.DongResponse;
import com.daullim.backend.domain.region.dto.SidoResponse;
import com.daullim.backend.domain.region.dto.SigunguResponse;
import com.daullim.backend.domain.region.service.RegionQueryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Pattern;
import java.util.List;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "지역", description = "지역 셀렉터 3단 — 코드는 행정표준코드")
@RestController
@RequestMapping("/api/v1/regions")
@Validated
public class RegionController {

  private final RegionQueryService service;

  RegionController(RegionQueryService service) {
    this.service = service;
  }

  @Operation(summary = "시도 목록 조회")
  @GetMapping("/sidos")
  public ApiResponse<List<SidoResponse>> sidos() {
    return ApiResponse.ok(service.sidos());
  }

  @Operation(summary = "시군구 목록 조회")
  @GetMapping("/sigungus")
  public ApiResponse<List<SigunguResponse>> sigungus(
      @RequestParam @Pattern(regexp = "\\d{2}", message = "시도코드는 2자리 숫자입니다.") String sidoCd) {
    return ApiResponse.ok(service.sigungus(sidoCd));
  }

  @Operation(summary = "행정동 목록 조회")
  @GetMapping("/dongs")
  public ApiResponse<List<DongResponse>> dongs(
      @RequestParam @Pattern(regexp = "\\d{5}", message = "시군구코드는 5자리 숫자입니다.") String sigunguCd) {
    return ApiResponse.ok(service.dongs(sigunguCd));
  }
}
