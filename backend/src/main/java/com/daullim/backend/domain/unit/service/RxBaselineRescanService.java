package com.daullim.backend.domain.unit.service;

import com.daullim.backend.domain.code.service.CodeBook;
import com.daullim.backend.domain.code.service.CodeBookProvider;
import com.daullim.backend.domain.unit.entity.Unit;
import com.daullim.backend.domain.unit.repository.UnitRepository;
import com.daullim.backend.domain.visit.service.DetectorPolicy;
import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 재산입 — 기준일에서 내용연수가 지난 완료 세대를 큐로 되돌림. */
@Service
public class RxBaselineRescanService {

  private static final Logger log = LoggerFactory.getLogger(RxBaselineRescanService.class);
  private static final DateTimeFormatter DAY = DateTimeFormatter.BASIC_ISO_DATE;
  private static final String DONE_STATUS = "done";
  private static final String QUEUED_STATUS = "pending";

  private final UnitRepository units;
  private final CodeBookProvider codeBooks;
  private final Clock clock;

  RxBaselineRescanService(UnitRepository units, CodeBookProvider codeBooks, Clock clock) {
    this.units = units;
    this.codeBooks = codeBooks;
    this.clock = clock;
  }

  @Transactional
  public int rescan() {
    CodeBook cb = codeBooks.get();
    String pending = cb.unitStatus(QUEUED_STATUS).getCode();
    String cutoff = LocalDate.now(clock).minusYears(DetectorPolicy.SERVICE_LIFE_YEARS).format(DAY);

    List<Unit> due = units.findByStatusCodeAndRxBaselineDayLessThanEqual(DONE_STATUS, cutoff);
    due.forEach(unit -> unit.resetToPending(pending));

    if (!due.isEmpty()) {
      log.info("재산입: 기준일 {} 이전 세대 {}건을 대기로 되돌림", cutoff, due.size());
    }
    return due.size();
  }
}
