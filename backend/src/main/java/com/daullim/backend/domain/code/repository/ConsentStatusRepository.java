package com.daullim.backend.domain.code.repository;

import com.daullim.backend.domain.code.entity.ConsentStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.repository.Repository;

public interface ConsentStatusRepository extends Repository<ConsentStatus, String> {

  List<ConsentStatus> findAll();

  Optional<ConsentStatus> findById(String code);
}
