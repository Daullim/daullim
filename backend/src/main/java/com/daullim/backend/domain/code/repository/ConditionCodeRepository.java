package com.daullim.backend.domain.code.repository;

import com.daullim.backend.domain.code.entity.ConditionCode;
import java.util.List;
import java.util.Optional;
import org.springframework.data.repository.Repository;

public interface ConditionCodeRepository extends Repository<ConditionCode, String> {

  List<ConditionCode> findAll();

  Optional<ConditionCode> findById(String code);
}
