package com.daullim.backend.domain.code.repository;

import com.daullim.backend.domain.code.entity.UnitStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.repository.Repository;

public interface UnitStatusRepository extends Repository<UnitStatus, String> {

  List<UnitStatus> findAll();

  Optional<UnitStatus> findById(String code);
}
