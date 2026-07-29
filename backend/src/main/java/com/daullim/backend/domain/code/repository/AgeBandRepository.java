package com.daullim.backend.domain.code.repository;

import com.daullim.backend.domain.code.entity.AgeBand;
import java.util.List;
import java.util.Optional;
import org.springframework.data.repository.Repository;

public interface AgeBandRepository extends Repository<AgeBand, String> {

  List<AgeBand> findAll();

  Optional<AgeBand> findById(String code);
}
