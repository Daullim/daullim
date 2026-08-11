package com.daullim.backend.domain.unit.service;

import com.daullim.backend.common.error.BusinessException;
import com.daullim.backend.common.error.ErrorCode;
import com.daullim.backend.domain.building.repository.BuildingQueryRepository;
import com.daullim.backend.domain.unit.dto.UnitResponse;
import com.daullim.backend.domain.unit.entity.Unit;
import com.daullim.backend.domain.unit.repository.UnitRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 세대 조회(F-1)와 현장 호수 입력(F-2). 조회 API 중 쓰기는 {@code ho_nm} 하나뿐이다. */
@Service
@Transactional(readOnly = true)
public class UnitService {

  /** 대장 유래 호수(전유부·본가구) 현장 수정 불가 */
  private static final String SOURCE_FIELD = "field";

  private final UnitRepository units;
  private final BuildingQueryRepository buildings;

  UnitService(UnitRepository units, BuildingQueryRepository buildings) {
    this.units = units;
    this.buildings = buildings;
  }

  public List<UnitResponse> listByBuilding(long buildingId) {
    if (!buildings.existsById(buildingId)) {
      throw new BusinessException(ErrorCode.NOT_FOUND, "건물을 찾을 수 없습니다.");
    }
    return units.findByBuildingIdOrderByUnitSeqAsc(buildingId).stream()
        .map(UnitResponse::from)
        .toList();
  }

  @Transactional
  public UnitResponse rename(long unitId, String hoNm) {
    Unit unit =
        units
            .findById(unitId)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "세대를 찾을 수 없습니다."));

    if (!SOURCE_FIELD.equals(unit.getHoNmSourceCode())) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "대장에서 온 호수는 수정할 수 없습니다.");
    }

    String trimmed = hoNm.trim();
    if (trimmed.equals(unit.getHoNm())) {
      return UnitResponse.from(unit);
    }
    if (units.existsByBuilding_IdAndHoNm(unit.getBuilding().getId(), trimmed)) {
      throw new BusinessException(ErrorCode.CONFLICT, "같은 건물에 이미 있는 호수입니다.");
    }

    unit.renameHo(trimmed, SOURCE_FIELD);
    return UnitResponse.from(unit);
  }
}
