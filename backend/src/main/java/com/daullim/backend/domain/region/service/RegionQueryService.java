package com.daullim.backend.domain.region.service;

import com.daullim.backend.domain.region.RegionCatalog;
import com.daullim.backend.domain.region.dto.DongResponse;
import com.daullim.backend.domain.region.dto.SidoResponse;
import com.daullim.backend.domain.region.dto.SigunguResponse;
import com.daullim.backend.domain.region.repository.RegionQueryRepository;
import com.daullim.backend.domain.region.repository.RegionQueryRepository.DongAggregate;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 지역 셀렉터 3단 — 명칭은 사전, 집계는 DB에서 와서 여기서 합쳐진다. */
@Service
@Transactional(readOnly = true)
public class RegionQueryService {

  private final RegionCatalog catalog;
  private final RegionQueryRepository repository;

  RegionQueryService(RegionCatalog catalog, RegionQueryRepository repository) {
    this.catalog = catalog;
    this.repository = repository;
  }

  public List<SidoResponse> sidos() {
    return catalog.sidos().stream().map(r -> new SidoResponse(r.code(), r.name())).toList();
  }

  public List<SigunguResponse> sigungus(String sidoCd) {
    Map<String, String> regionTypes = repository.majorityRegionTypeBySigungu(sidoCd);
    return catalog.sigungus(sidoCd).stream()
        .map(r -> new SigunguResponse(r.code(), r.name(), regionTypes.get(r.code())))
        .toList();
  }

  public List<DongResponse> dongs(String sigunguCd) {
    Map<String, DongAggregate> aggregates = repository.aggregateByDong(sigunguCd);
    return catalog.dongs(sigunguCd).stream()
        .map(
            r -> {
              DongAggregate agg = aggregates.get(r.code());
              return agg == null
                  ? new DongResponse(r.code(), r.name(), 0L, BigDecimal.ZERO, null)
                  : new DongResponse(
                      r.code(),
                      r.name(),
                      agg.householdCount(),
                      agg.avgRiskScore(),
                      agg.avgRiskLevelCd());
            })
        .toList();
  }
}
