package com.daullim.backend.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.daullim.backend.TestcontainersConfiguration;
import com.daullim.backend.domain.building.entity.Building;
import com.daullim.backend.domain.building.repository.BuildingRepository;
import com.daullim.backend.domain.unit.entity.Unit;
import com.daullim.backend.domain.unit.repository.UnitRepository;
import com.daullim.backend.domain.user.entity.User;
import com.daullim.backend.domain.user.repository.UserRepository;
import com.daullim.backend.domain.visit.entity.ReplacementItem;
import com.daullim.backend.domain.visit.entity.Visit;
import com.daullim.backend.domain.visit.repository.VisitRepository;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;

/** 이 테스트가 기동한다는 것 자체가 13테이블 전체의 ddl-auto=validate 통과 증거다. */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@Transactional
class CoreEntityIT {

  @Autowired BuildingRepository buildings;
  @Autowired UserRepository users;
  @Autowired UnitRepository units;
  @Autowired VisitRepository visits;
  @Autowired JdbcClient jdbc;
  @Autowired EntityManager em;

  private Building building;
  private User officer;
  private Unit unit;

  /** buildings는 pipeline 소유라 리포지토리로 넣을 수 없다 — 픽스처는 SQL로 직접 만든다. */
  @BeforeEach
  void setUp() {
    String bldKey = "TEST-" + UUID.randomUUID();
    jdbc.sql(
            """
            INSERT INTO buildings (bld_key,sido_cd,sigungu_cd,admin_dong_cd,address,lat,lng,
              house_type_cd,floor_count,unit_count,use_apr_day,region_type_cd,score,risk_level_cd,
              order_key,score_version,computed_at)
            VALUES (:k,'11','11620','1162053','서울 관악구 신림동 123-4',37.4,126.9,
              'multi-family',3,4,'20050310','URBAN',88.5,'danger',1,'v1',now())
            """)
        .param("k", bldKey)
        .update();

    building = buildings.findByBldKey(bldKey).orElseThrow();
    officer =
        users.save(
            new User(
                "kim01-" + UUID.randomUUID(),
                "{bcrypt}stub",
                "김점검",
                "010-1234-5678",
                LocalDate.of(1990, 1, 1),
                "officer"));
    unit = units.save(new Unit(building, (short) 1, "101호", (short) 1, "expos", "pending"));
  }

  @Test
  @DisplayName("buildings의 GENERATED 주소가 공백을 제거해 되읽힌다")
  void addressNormIsGenerated() {
    assertThat(building.getAddress()).isEqualTo("서울 관악구 신림동 123-4");
    assertThat(building.getAddressNorm()).isEqualTo("서울관악구신림동123-4");
  }

  @Test
  @DisplayName("char(8)·smallint·numeric 컬럼이 값 손실 없이 왕복한다")
  void charAndNumericRoundTrip() {
    assertThat(building.getUseAprDay()).isEqualTo("20050310");
    assertThat(building.getFloorCount()).isEqualTo((short) 3);
    assertThat(building.getScore()).isEqualByComparingTo("88.50");
    assertThat(building.getLat()).isEqualByComparingTo("37.4");
  }

  @Test
  @DisplayName("BuildingRepository에는 저장·삭제 메서드가 없다")
  void buildingRepositoryIsReadOnly() {
    assertThat(BuildingRepository.class.getMethods())
        .extracting(java.lang.reflect.Method::getName)
        .doesNotContain("save", "saveAll", "delete", "deleteAll", "deleteById");
  }

  @Test
  @DisplayName("승낙 방문: 실측 제조년월이면 is_age_estimated가 false로 되읽힌다")
  void inspectedVisitWithMeasuredMfgYm() {
    Visit visit = new Visit(unit, officer, "20260729", Instant.now(), "accepted", true, "v1");
    visit.applyGate("owner", null, null, null, null);
    visit.applyAlarmJudgment((short) 3, "2020-05", null, (short) 1, false, (short) 1, "DEFECTIVE");
    visit.applyPostCare("installed", "done", "not-needed", "커버 교체 완료");
    visit.applyDispatchSnapshot(
        UUID.randomUUID(),
        (short) 1,
        new BigDecimal("88.50"),
        1,
        "v1",
        new BigDecimal("37.400000"),
        new BigDecimal("126.900000"));

    ReplacementItem item =
        new ReplacementItem((short) 1, "battery-dead", "sealed", "RX-IOT", "DEFECTIVE", false);
    visit.addReplacementItem(item);

    visits.save(visit);
    em.flush();
    em.clear();

    Visit found = visits.findById(visit.getId()).orElseThrow();
    assertThat(found.getMfgYm()).isEqualTo("2020-05");
    assertThat(found.getAgeEstimated()).isFalse();
    assertThat(found.getEffectiveReplaceCount()).isEqualTo((short) 1);
    assertThat(found.getRuleVersion()).isEqualTo("v1");
    assertThat(found.getClientVisitId()).isNotNull();
  }

  @Test
  @DisplayName("추정 연차면 is_age_estimated가 true로 되읽힌다")
  void estimatedAgeIsFlagged() {
    Visit visit = new Visit(unit, officer, "20260729", Instant.now(), "accepted", true, "v1");
    visit.applyGate("tenant", null, null, null, null);
    visit.applyAlarmJudgment((short) 2, null, "gt-15", null, true, (short) 2, "EXPIRED");
    visit.applyPostCare("missing", "advised-only", "revisit", null);

    visits.save(visit);
    em.flush();
    em.clear();

    Visit found = visits.findById(visit.getId()).orElseThrow();
    assertThat(found.getAgeEstimated()).isTrue();
    assertThat(found.getExpired()).isTrue();
    assertThat(found.getEffectiveReplaceCount()).isEqualTo(found.getRoomCount());
  }

  @Test
  @DisplayName("교체 항목과 외관 플래그가 방문 저장 한 번에 캐스케이드된다")
  void itemsAndFlagsCascade() {
    Visit visit = new Visit(unit, officer, "20260729", Instant.now(), "accepted", true, "v1");
    visit.applyGate("owner", null, null, null, null);
    visit.applyAlarmJudgment((short) 2, "2015-03", null, (short) 1, false, (short) 1, "DEFECTIVE");
    visit.applyPostCare("installed", "done", "not-needed", null);

    ReplacementItem item =
        new ReplacementItem((short) 1, "appearance", null, "RX-IOT", "DEFECTIVE", false);
    item.addFlag("cover-damage");
    item.addFlag("stain");
    visit.addReplacementItem(item);

    visits.save(visit);
    em.flush();
    em.clear();

    Visit found = visits.findById(visit.getId()).orElseThrow();
    assertThat(found.getReplacementItems()).hasSize(1);
    assertThat(found.getReplacementItems().get(0).getDetectorFlagCodes())
        .containsExactlyInAnyOrder("cover-damage", "stain");

    Integer flagRows =
        jdbc.sql("SELECT count(*) FROM replacement_item_flags").query(Integer.class).single();
    assertThat(flagRows).isEqualTo(2);
  }

  @Test
  @DisplayName("비승낙 방문은 경보기 필드 전량 null로 저장된다")
  void notInspectedVisitKeepsAlarmFieldsNull() {
    Visit visit = new Visit(unit, officer, "20260729", Instant.now(), "refused", false, "v1");
    visit.applyGate(null, "self-replaced", "within-6m", "yes", "작년에 직접 교체했다고 함");
    visit.applyPostCare(null, null, "not-needed", null);

    visits.save(visit);
    em.flush();
    em.clear();

    Visit found = visits.findById(visit.getId()).orElseThrow();
    assertThat(found.isInspected()).isFalse();
    assertThat(found.getRoomCount()).isNull();
    assertThat(found.getEffectiveReplaceCount()).isNull();
    assertThat(found.getExpired()).isNull();
    assertThat(found.getConditionCode()).isNull();
    assertThat(found.getAgeEstimated()).isFalse();
    assertThat(found.getSelfReportPeriodCode()).isEqualTo("within-6m");
  }

  @Test
  @DisplayName("비승낙인데 경보기 값을 채우면 DB CHECK가 막는다")
  void notInspectedWithAlarmFieldsIsRejected() {
    Visit visit = new Visit(unit, officer, "20260729", Instant.now(), "vacant", false, "v1");
    visit.applyAlarmJudgment((short) 3, null, null, null, null, null, null);

    // IDENTITY 채번이라 save() 시점에 이미 INSERT가 나간다 — flush를 기다리지 않는다.
    assertThatThrownBy(
            () -> {
              visits.save(visit);
              em.flush();
            })
        .isInstanceOf(DataIntegrityViolationException.class)
        .hasMessageContaining("ck_v_na");
  }

  @Test
  @DisplayName("세대 캐시가 갱신되고 재산입 스캔이 그 기준일로 대상을 찾는다")
  void unitCacheAndRescanQuery() {
    unit.recordVisit("done", "20260729");
    unit.markRxBaseline("20260729");
    em.flush();
    em.clear();

    Unit found = units.findById(unit.getId()).orElseThrow();
    assertThat(found.getStatusCode()).isEqualTo("done");
    assertThat(found.getLastInspectedDay()).isEqualTo("20260729");
    assertThat(found.getRxBaselineDay()).isEqualTo("20260729");

    assertThat(units.findByStatusCodeAndRxBaselineDayLessThanEqual("done", "20410729"))
        .extracting(Unit::getId)
        .contains(found.getId());
    assertThat(units.findByStatusCodeAndRxBaselineDayLessThanEqual("done", "20260101"))
        .extracting(Unit::getId)
        .doesNotContain(found.getId());
  }

  @Test
  @DisplayName("멱등 키로 기존 방문을 다시 찾는다")
  void findByClientVisitId() {
    UUID key = UUID.randomUUID();
    Visit visit = new Visit(unit, officer, "20260729", Instant.now(), "unreachable", false, "v1");
    visit.applyDispatchSnapshot(key, null, null, null, null, null, null);
    visits.save(visit);
    em.flush();
    em.clear();

    assertThat(visits.findByClientVisitId(key))
        .get()
        .extracting(Visit::getId)
        .isEqualTo(visit.getId());
  }
}
