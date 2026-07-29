package com.daullim.backend.domain.code.repository;

import com.daullim.backend.domain.code.entity.BatteryType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.repository.Repository;

public interface BatteryTypeRepository extends Repository<BatteryType, String> {

  List<BatteryType> findAll();

  Optional<BatteryType> findById(String code);
}
