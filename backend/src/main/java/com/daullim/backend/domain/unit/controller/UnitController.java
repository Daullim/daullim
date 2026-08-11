package com.daullim.backend.domain.unit.controller;

import com.daullim.backend.common.response.ApiResponse;
import com.daullim.backend.domain.unit.dto.UnitRenameRequest;
import com.daullim.backend.domain.unit.dto.UnitResponse;
import com.daullim.backend.domain.unit.service.UnitService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** 세대는 건물 하위 리소스 — 목록은 건물 경로, 수정은 세대 경로 */
@Tag(name = "세대", description = "세대 목록과 현장 호수 입력")
@RestController
public class UnitController {

  private final UnitService service;

  UnitController(UnitService service) {
    this.service = service;
  }

  @Operation(summary = "세대 목록 조회", description = "unitSeq 오름차순. 건물이 없으면 404.")
  @GetMapping("/api/v1/buildings/{buildingId}/units")
  public ApiResponse<List<UnitResponse>> listByBuilding(@PathVariable long buildingId) {
    return ApiResponse.ok(service.listByBuilding(buildingId));
  }

  @Operation(
      summary = "세대 호수 수정",
      description = "ho_nm_source_cd='field' 행만 허용(그 외 403). 건물 내 호수 중복은 409.")
  @PatchMapping("/api/v1/units/{unitId}")
  public ApiResponse<UnitResponse> rename(
      @PathVariable long unitId, @RequestBody @Valid UnitRenameRequest request) {
    return ApiResponse.ok(service.rename(unitId, request.hoNm()));
  }
}
