package com.daullim.backend.domain.grid.controller;

import com.daullim.backend.common.response.ApiResponse;
import com.daullim.backend.domain.grid.dto.GridSummaryItem;
import com.daullim.backend.domain.grid.service.GridQueryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Pattern;
import java.util.List;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "지도", description = "격자 집계")
@RestController
@RequestMapping("/api/v1/grids")
@Validated
public class GridController {

  private final GridQueryService service;

  GridController(GridQueryService service) {
    this.service = service;
  }

  @Operation(summary = "격자 방문 현황 조회", description = "응답 gridId는 1km — 정적 GeoJSON과 그대로 조인된다.")
  @GetMapping("/summary")
  public ApiResponse<List<GridSummaryItem>> summary(
      @RequestParam @Pattern(regexp = "\\d{10}", message = "행정동코드는 10자리 숫자입니다.") String dongCd) {
    return ApiResponse.ok(service.summary(dongCd));
  }
}
