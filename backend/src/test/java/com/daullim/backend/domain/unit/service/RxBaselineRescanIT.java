package com.daullim.backend.domain.unit.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.daullim.backend.TestcontainersConfiguration;
import com.daullim.backend.domain.building.repository.BuildingRepository;
import com.daullim.backend.domain.unit.entity.Unit;
import com.daullim.backend.domain.unit.repository.UnitRepository;
import jakarta.persistence.EntityManager;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;

/** 재산입 — 15년 경계 전후와 기준일 유지. */
@Import({TestcontainersConfiguration.class, RxBaselineRescanIT.FixedClock.class})
@SpringBootTest
@Transactional
class RxBaselineRescanIT {

  @TestConfiguration
  static class FixedClock {
    @Bean
    @Primary
    Clock fixedClock() {
      return Clock.fixed(Instant.parse("2026-07-15T00:00:00Z"), ZoneId.of("Asia/Seoul"));
    }
  }

  /** 오늘(20260715)에서 정확히 15년 전. */
  private static final String CUTOFF = "20110715";

  @Autowired RxBaselineRescanService rescan;
  @Autowired UnitRepository units;
  @Autowired BuildingRepository buildings;
  @Autowired JdbcClient jdbc;
  @Autowired EntityManager em;

  private com.daullim.backend.domain.building.entity.Building building;

  @BeforeEach
  void setUp() {
    String bldKey = "TEST-" + UUID.randomUUID();
    jdbc.sql(
            """
            INSERT INTO buildings (bld_key,sido_cd,sigungu_cd,admin_dong_cd,address,lat,lng,
              house_type_cd,floor_count,unit_count,region_type_cd,score,risk_level_cd,
              order_key,score_version,computed_at)
            VALUES (:k,'11','11620','1162053','서울 관악구 신림동 1',37.4,126.9,
              'multi-family',3,4,'URBAN',88.5,'danger',1,'v1',now())
            """)
        .param("k", bldKey)
        .update();
    building = buildings.findByBldKey(bldKey).orElseThrow();
  }

  @Test
  @DisplayName("기준일이 15년째 되는 날이면 대기로 돌아온다")
  void unitDueOnTheBoundaryReturnsToQueue() {
    Long id = doneUnit((short) 1, CUTOFF);

    assertThat(rescan.rescan()).isEqualTo(1);
    em.flush();
    em.clear();

    assertThat(units.findById(id).orElseThrow().getStatusCode()).isEqualTo("pending");
  }

  @Test
  @DisplayName("하루라도 덜 지났으면 그대로 완료로 둔다")
  void unitOneDayShortStaysDone() {
    Long id = doneUnit((short) 1, "20110716");

    assertThat(rescan.rescan()).isZero();
    em.flush();
    em.clear();

    assertThat(units.findById(id).orElseThrow().getStatusCode()).isEqualTo("done");
  }

  @Test
  @DisplayName("되돌린 뒤에도 기준일은 지우지 않는다")
  void baselineSurvivesTheReset() {
    Long id = doneUnit((short) 1, CUTOFF);

    rescan.rescan();
    em.flush();
    em.clear();

    assertThat(units.findById(id).orElseThrow().getRxBaselineDay()).isEqualTo(CUTOFF);
  }

  @Test
  @DisplayName("기준일이 없는 세대와 완료가 아닌 세대는 스캔이 건드리지 않는다")
  void onlyDoneUnitsWithBaselineAreScanned() {
    Long noBaseline = doneUnit((short) 1, null);
    Long refused = units.save(unit((short) 2)).getId();
    units.findById(refused).orElseThrow().recordVisit("refused", "20100101");
    units.findById(refused).orElseThrow().markRxBaseline(CUTOFF);
    em.flush();

    assertThat(rescan.rescan()).isZero();
    em.flush();
    em.clear();

    assertThat(units.findById(noBaseline).orElseThrow().getStatusCode()).isEqualTo("done");
    assertThat(units.findById(refused).orElseThrow().getStatusCode()).isEqualTo("refused");
  }

  private Long doneUnit(short seq, String baselineDay) {
    Unit saved = units.save(unit(seq));
    saved.recordVisit("done", "20260101");
    if (baselineDay != null) {
      saved.markRxBaseline(baselineDay);
    }
    em.flush();
    return saved.getId();
  }

  private Unit unit(short seq) {
    return new Unit(building, seq, seq + "호", (short) 1, "expos", "pending");
  }
}
