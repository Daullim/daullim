package com.daullim.backend.domain.building.controller;

import com.daullim.backend.common.response.ApiResponse;
import com.daullim.backend.common.response.CursorPage;
import com.daullim.backend.domain.building.dto.BuildingDetailResponse;
import com.daullim.backend.domain.building.dto.BuildingQueueItem;
import com.daullim.backend.domain.building.service.BuildingQueryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "대상건물", description = "우선순위 큐와 대장 프리필")
@RestController
@RequestMapping("/api/v1/buildings")
@Validated
public class BuildingController {

  private static final int DEFAULT_SIZE = 20;

  private final BuildingQueryService service;

  BuildingController(BuildingQueryService service) {
    this.service = service;
  }

  @Operation(summary = "우선순위 큐 조회", description = "order_key 오름차순 고정. gridId는 1km 격자다.")
  @GetMapping("/queue")
  public ApiResponse<CursorPage<BuildingQueueItem>> queue(
      @RequestParam @Pattern(regexp = "\\d{10}", message = "행정동코드는 10자리 숫자입니다.") String dongCd,
      @RequestParam(required = false) String gridId,
      @RequestParam(required = false) String q,
      @RequestParam(required = false) String cursor,
      @RequestParam(required = false, defaultValue = "" + DEFAULT_SIZE)
          @Min(value = 1, message = "size는 1 이상입니다.") @Max(value = 100, message = "size는 100 이하입니다.") int size) {
    return ApiResponse.ok(service.queue(dongCd, gridId, q, cursor, size));
  }

  @Operation(summary = "건물 상세 조회")
  @GetMapping("/{buildingId}")
  public ApiResponse<BuildingDetailResponse> detail(@PathVariable long buildingId) {
    return ApiResponse.ok(service.detail(buildingId));
  }
}
