package com.daullim.backend;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

@TestConfiguration(proxyBeanMethods = false)
class TestcontainersConfiguration {

  @Bean
  @ServiceConnection
  PostgreSQLContainer postgresContainer() {
    // compose.yaml과 동일 버전으로 고정 — 테스트와 로컬이 다른 PG에서 돌면 검증이 의미를 잃는다.
    return new PostgreSQLContainer(DockerImageName.parse("postgres:15-alpine"));
  }
}
