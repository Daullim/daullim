package com.daullim.backend.domain.dashboard.service;

import com.daullim.backend.domain.dashboard.dto.DashboardSummaryResponse;
import com.daullim.backend.domain.dashboard.repository.DashboardQueryRepository;
import com.daullim.backend.domain.dashboard.repository.DashboardQueryRepository.Counts;
import java.time.Clock;
import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class DashboardQueryService {

  private final DashboardQueryRepository repository;
  private final Clock clock;

  DashboardQueryService(DashboardQueryRepository repository, Clock clock) {
    this.repository = repository;
    this.clock = clock;
  }

  public DashboardSummaryResponse summary(String sigunguCd) {
    Counts counts = repository.summarize(sigunguCd);
    return new DashboardSummaryResponse(
        counts.targetCount(), counts.doneCount(), counts.dangerCount(), Instant.now(clock));
  }
}
