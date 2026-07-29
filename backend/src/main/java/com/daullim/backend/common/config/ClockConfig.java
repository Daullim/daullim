package com.daullim.backend.common.config;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ClockConfig {

  /** 방문일 & 재산입 기준일은 KST 달력일 */
  @Bean
  Clock clock() {
    return Clock.system(ZoneId.of("Asia/Seoul"));
  }
}
