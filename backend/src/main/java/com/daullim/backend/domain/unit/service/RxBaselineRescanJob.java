package com.daullim.backend.domain.unit.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** 재산입 스캔 트리거. app.scheduling.enabled */
@Component
public class RxBaselineRescanJob {

  private final RxBaselineRescanService rescan;

  RxBaselineRescanJob(RxBaselineRescanService rescan) {
    this.rescan = rescan;
  }

  @Scheduled(cron = "0 30 3 * * *", zone = "Asia/Seoul")
  public void run() {
    rescan.rescan();
  }
}
