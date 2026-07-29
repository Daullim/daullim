package com.daullim.backend.domain.building.repository;

import com.daullim.backend.domain.building.entity.Building;
import java.util.List;
import java.util.Optional;
import org.springframework.data.repository.Repository;

public interface BuildingRepository extends Repository<Building, Long> {

  Optional<Building> findById(Long id);

  Optional<Building> findByBldKey(String bldKey);

  List<Building> findBySigunguCodeAndAdminDongCodeOrderByOrderKeyAsc(
      String sigunguCode, String adminDongCode);
}
