package com.daullim.backend.domain.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.daullim.backend.TestcontainersConfiguration;
import com.daullim.backend.common.security.JwtTokenProvider;
import com.daullim.backend.domain.user.entity.User;
import com.daullim.backend.domain.user.repository.UserRepository;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;

/**
 * A-4 회원탈퇴 — 진짜 토큰 사용({@code jwt()} mock은 ActiveAccountFilter를 건너뜀), 트랜잭션 없음(필터가 별도 커넥션이라 커밋 필요).
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class AuthWithdrawIT {

  @Autowired MockMvc mvc;
  @Autowired UserRepository users;
  @Autowired JwtTokenProvider tokenProvider;
  @Autowired JdbcClient jdbc;

  private Long userId;
  private String token;
  private String buildingKey;

  @BeforeEach
  void setUp() {
    User saved =
        users.save(
            new User(
                "quit-" + UUID.randomUUID(),
                "{bcrypt}stub",
                "김탈퇴",
                "010-1234-5678",
                LocalDate.of(1990, 1, 1),
                "officer"));
    userId = saved.getId();
    token = tokenProvider.issue(saved.getId(), saved.getLoginId(), saved.getRoleCode());
  }

  /** 다른 IT가 전역 집계를 볼 수 있으므로 이 테스트가 만든 행만 골라 지운다 (FK 역순). */
  @AfterEach
  void tearDown() {
    if (buildingKey != null) {
      jdbc.sql(
              """
              DELETE FROM visits WHERE unit_id IN (
                SELECT unit_id FROM units WHERE building_id IN (
                  SELECT building_id FROM buildings WHERE bld_key = :k))
              """)
          .param("k", buildingKey)
          .update();
      jdbc.sql(
              """
              DELETE FROM units WHERE building_id IN (
                SELECT building_id FROM buildings WHERE bld_key = :k)
              """)
          .param("k", buildingKey)
          .update();
      jdbc.sql("DELETE FROM buildings WHERE bld_key = :k").param("k", buildingKey).update();
      buildingKey = null;
    }
    jdbc.sql("DELETE FROM users WHERE user_id = :id").param("id", userId).update();
  }

  @Test
  @DisplayName("탈퇴는 204이고 행은 남는다 — is_active=false + withdrawn_at")
  void withdrawSoftDeletes() throws Exception {
    mvc.perform(delete("/api/v1/auth/me").header("Authorization", "Bearer " + token))
        .andExpect(status().isNoContent());

    Map<String, Object> row =
        jdbc.sql("SELECT is_active, withdrawn_at FROM users WHERE user_id = :id")
            .param("id", userId)
            .query()
            .singleRow();
    assertThat(row.get("is_active")).isEqualTo(false);
    assertThat(row.get("withdrawn_at")).isNotNull();
  }

  @Test
  @DisplayName("탈퇴한 토큰은 /auth/me뿐 아니라 조회 API 전 경로에서 401이다")
  void withdrawnTokenIsRejectedEverywhere() throws Exception {
    // 탈퇴 전에는 통과한다 — 뒤의 401이 토큰 자체의 문제가 아님을 못 박는다.
    mvc.perform(get("/api/v1/regions/sidos").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk());

    mvc.perform(delete("/api/v1/auth/me").header("Authorization", "Bearer " + token))
        .andExpect(status().isNoContent());

    mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + token))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));

    // 서명·만료는 멀쩡하다 — 계정이 죽었으므로 막혀야 한다
    mvc.perform(get("/api/v1/regions/sidos").header("Authorization", "Bearer " + token))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
  }

  @Test
  @DisplayName("이미 탈퇴한 계정의 재요청은 401이다 — 두 번 탈퇴되지 않는다")
  void secondWithdrawIsUnauthorized() throws Exception {
    mvc.perform(delete("/api/v1/auth/me").header("Authorization", "Bearer " + token))
        .andExpect(status().isNoContent());

    mvc.perform(delete("/api/v1/auth/me").header("Authorization", "Bearer " + token))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("탈퇴해도 그 사람이 남긴 점검 이력은 남는다 (ON DELETE RESTRICT)")
  void visitsSurviveWithdrawal() throws Exception {
    long visitId = insertVisitBy(userId);

    mvc.perform(delete("/api/v1/auth/me").header("Authorization", "Bearer " + token))
        .andExpect(status().isNoContent());

    Map<String, Object> row =
        jdbc.sql("SELECT officer_id FROM visits WHERE visit_id = :id")
            .param("id", visitId)
            .query()
            .singleRow();
    assertThat(row.get("officer_id")).isEqualTo(userId);
  }

  /** 방문 1건 — 저장 경로를 다시 태우지 않고 최소 컬럼만 채운다(비승낙이라 경보기 필드가 없다). */
  private long insertVisitBy(long officerId) {
    String bldKey = "WD-" + UUID.randomUUID();
    buildingKey = bldKey;
    jdbc.sql(
            """
            INSERT INTO buildings (bld_key,sido_cd,sigungu_cd,admin_dong_cd,address,lat,lng,
              house_type_cd,floor_count,unit_count,region_type_cd,score,risk_level_cd,
              order_key,score_version,computed_at)
            VALUES (:k,'11','11620','1162069500','서울 관악구 신림동 1',37.4,126.9,
              'detached',1,1,'URBAN',10.0,'ok',9001,'v1',now())
            """)
        .param("k", bldKey)
        .update();
    long unitId =
        jdbc.sql(
                """
                INSERT INTO units (building_id,unit_seq,ho_nm_source_cd,status_cd)
                VALUES ((SELECT building_id FROM buildings WHERE bld_key = :k),1,'implicit','pending')
                RETURNING unit_id
                """)
            .param("k", bldKey)
            .query(Long.class)
            .single();
    return jdbc.sql(
            """
            INSERT INTO visits (unit_id,officer_id,visited_day,consent_cd,is_inspected,
              revisit_plan_cd)
            VALUES (:unitId,:officerId,'20260715','vacant',false,'not-needed')
            RETURNING visit_id
            """)
        .param("unitId", unitId)
        .param("officerId", officerId)
        .query(Long.class)
        .single();
  }
}
