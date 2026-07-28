package com.daullim.backend.domain.code.repository;

import com.daullim.backend.domain.code.entity.DetectorFlag;
import java.util.List;
import java.util.Optional;
import org.springframework.data.repository.Repository;

public interface DetectorFlagRepository extends Repository<DetectorFlag, String> {

  List<DetectorFlag> findAll();

  Optional<DetectorFlag> findById(String code);
}
