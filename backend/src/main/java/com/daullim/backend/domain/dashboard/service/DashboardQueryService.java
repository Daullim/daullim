package com.daullim.backend.domain.dashboard.service;

import com.daullim.backend.domain.dashboard.dto.DashboardCompositionResponse;
import com.daullim.backend.domain.dashboard.dto.DashboardSummaryResponse;
import com.daullim.backend.domain.dashboard.repository.DashboardQueryRepository;
import com.daullim.backend.domain.dashboard.repository.DashboardQueryRepository.Counts;
import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class DashboardQueryService {

  // buildings.ck_bld_rx의 허용값 — lookup 테이블이 아니라 CHECK 제약이라 여기서 든다
  private static final List<String> RX_CODES = List.of("RX-IOT", "RX-BAT");

  private final DashboardQueryRepository repository;
  private final Clock clock;

  DashboardQueryService(DashboardQueryRepository repository, Clock clock) {
    this.repository = repository;
    this.clock = clock;
  }

  public DashboardSummaryResponse summary(String sigunguCd) {
    Counts counts = repository.summarize(sigunguCd);
    return new DashboardSummaryResponse(
        counts.targetCount(),
        counts.doneCount(),
        counts.dangerCount(),
        pendingByRxCode(sigunguCd),
        counts.computedAt(),
        Instant.now(clock));
  }

  public DashboardCompositionResponse composition(String sidoCd, String sigunguCd) {
    return repository.composition(sidoCd, sigunguCd);
  }

  /** 0건 코드까지 채움 — "전지 0대"가 떠야 소요 없음이 전달됨. */
  private Map<String, Long> pendingByRxCode(String sigunguCd) {
    Map<String, Long> counted = repository.pendingCountByRxCode(sigunguCd);
    Map<String, Long> filled = new LinkedHashMap<>();
    RX_CODES.forEach(code -> filled.put(code, counted.getOrDefault(code, 0L)));
    return filled;
  }
}
