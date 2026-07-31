package com.daullim.backend.common.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.scheduling.annotation.SchedulingConfiguration;

class SchedulingConfigTest {

  private final ApplicationContextRunner runner =
      new ApplicationContextRunner().withUserConfiguration(SchedulingConfig.class);

  @Test
  @DisplayName("속성이 false면 스케줄링 자체가 켜지지 않는다")
  void disabledByProperty() {
    runner
        .withPropertyValues("app.scheduling.enabled=false")
        .run(ctx -> assertThat(ctx).doesNotHaveBean(SchedulingConfiguration.class));
  }

  @Test
  @DisplayName("속성이 true면 스케줄링이 켜진다")
  void enabledByProperty() {
    runner
        .withPropertyValues("app.scheduling.enabled=true")
        .run(ctx -> assertThat(ctx).hasSingleBean(SchedulingConfiguration.class));
  }

  @Test
  @DisplayName("속성이 없으면 켜진다 — 배포에서 빠뜨려도 배치가 도는 쪽이 안전하다")
  void enabledWhenPropertyMissing() {
    runner.run(ctx -> assertThat(ctx).hasSingleBean(SchedulingConfiguration.class));
  }
}
