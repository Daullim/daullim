package com.daullim.backend.domain.grid.service;

import com.daullim.backend.domain.grid.dto.GridSummaryItem;
import com.daullim.backend.domain.grid.repository.GridQueryRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class GridQueryService {

  private final GridQueryRepository repository;

  GridQueryService(GridQueryRepository repository) {
    this.repository = repository;
  }

  public List<GridSummaryItem> summary(String dongCd) {
    return repository.summaryByDong(dongCd);
  }
}
