package com.daullim.backend.domain.visit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.daullim.backend.domain.QueryApiSupport;
import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/** G-1 점검 결과 저장 — 컨트롤러 경계만 검증(판정·트랜잭션은 {@code VisitSubmissionIT}가 덮음). */
class VisitApiIT extends QueryApiSupport {

  /** 서버가 방문일을 찍을 때 쓰는 그 시계 (KST 고정). */
  @Autowired Clock clock;

  @Nested
  @DisplayName("G-1. 승낙 방문")
  class AcceptedVisit {

    @Test
    @DisplayName("저장되면 201이고 점검원은 본문이 아니라 토큰에서 온다")
    void savesAndTakesOfficerFromToken() throws Exception {
      MvcResult saved =
          mvc.perform(
                  submit(
                      """
                      {"consentCd":"accepted","respondentTypeCd":"owner","roomCount":2,
                       "mfgYm":"%s","replaceCount":1,
                       "replacements":[{"replaceReasonCd":"battery-dead","batteryTypeCd":"sealed"}],
                       "extinguisherInstalledCd":"installed","rxDoneCd":"done",
                       "revisitPlanCd":"not-needed","note":"현장 교체 완료"}
                      """
                          .formatted(recentMfgYm())))
              .andExpect(status().isCreated())
              .andExpect(jsonPath("$.data.visitId").isNumber())
              .andExpect(jsonPath("$.data.visitedDay").value(today()))
              .andExpect(jsonPath("$.data.replay").value(false))
              .andReturn();

      Map<String, Object> row = visitRow(visitId(saved));
      assertThat(row.get("officer_id")).isEqualTo(officerId);
      assertThat(row.get("unit_id")).isEqualTo(b2FieldUnit);
      assertThat(row.get("is_inspected")).isEqualTo(true);
      // 서버가 다시 계산한 값 — 본문에는 없다
      assertSmallint(row, "effective_replace_count", 1);
      assertThat(row.get("condition_code_cd")).isEqualTo("DEFECTIVE");
      // 일체형 방전은 전지 교체가 불가해 기기 교체로 간다
      assertThat(itemRows(visitId(saved)))
          .singleElement()
          .satisfies(
              item -> {
                assertThat(item.get("rx_code_cd")).isEqualTo("RX-IOT");
                assertThat(item.get("is_auto_generated")).isEqualTo(false);
              });
    }

    @Test
    @DisplayName("내용연수가 지났으면 개수·사유 없이 보내도 자동 생성 항목이 실 개수만큼 붙는다")
    void expiredGeneratesItems() throws Exception {
      MvcResult saved =
          mvc.perform(
                  submit(
                      """
                      {"consentCd":"accepted","respondentTypeCd":"owner","roomCount":3,
                       "mfgYm":"2005-01","extinguisherInstalledCd":"installed",
                       "rxDoneCd":"advised-only","revisitPlanCd":"revisit"}
                      """))
              .andExpect(status().isCreated())
              .andReturn();

      Map<String, Object> row = visitRow(visitId(saved));
      assertThat(row)
          .containsEntry("is_expired", true)
          .containsEntry("condition_code_cd", "EXPIRED");
      assertSmallint(row, "effective_replace_count", 3);
      assertThat(itemRows(visitId(saved)))
          .hasSize(3)
          .allSatisfy(
              item -> {
                assertThat(item.get("replace_reason_cd")).isEqualTo("expired");
                assertThat(item.get("is_auto_generated")).isEqualTo(true);
              });
    }

    @Test
    @DisplayName("제조년월 미표기도 실측 없이 저장되고 전량이 자동 생성된다")
    void unmarkedGeneratesItems() throws Exception {
      MvcResult saved =
          mvc.perform(
                  submit(
                      """
                      {"consentCd":"accepted","respondentTypeCd":"owner","roomCount":2,
                       "mfgUnmarked":true,"extinguisherInstalledCd":"installed",
                       "rxDoneCd":"done","revisitPlanCd":"not-needed"}
                      """))
              .andExpect(status().isCreated())
              .andReturn();

      Map<String, Object> row = visitRow(visitId(saved));
      assertThat(row).containsEntry("mfg_ym", null).containsEntry("mfg_unmarked", true);
      assertSmallint(row, "effective_replace_count", 2);
      assertThat(itemRows(visitId(saved)))
          .hasSize(2)
          .allSatisfy(item -> assertThat(item.get("replace_reason_cd")).isEqualTo("unmarked"));
    }
  }

  @Nested
  @DisplayName("G-1. 비승낙 방문")
  class NotInspectedVisit {

    @Test
    @DisplayName("게이트 값만으로 저장되고, 경보기 필드를 실어 보내도 남지 않는다")
    void dropsAlarmFields() throws Exception {
      MvcResult saved =
          mvc.perform(
                  submit(
                      """
                      {"consentCd":"vacant","revisitPlanCd":"revisit","note":"부재",
                       "roomCount":2,"mfgYm":"2020-01","replaceCount":1,
                       "replacements":[{"replaceReasonCd":"detached"}],
                       "extinguisherInstalledCd":"installed","rxDoneCd":"done"}
                      """))
              .andExpect(status().isCreated())
              .andReturn();

      Map<String, Object> row = visitRow(visitId(saved));
      assertThat(row.get("is_inspected")).isEqualTo(false);
      assertThat(row)
          .containsEntry("room_count", null)
          .containsEntry("mfg_ym", null)
          .containsEntry("replace_count", null)
          .containsEntry("effective_replace_count", null)
          .containsEntry("extinguisher_installed_cd", null)
          .containsEntry("rx_done_cd", null)
          .containsEntry("condition_code_cd", null);
      assertThat(itemRows(visitId(saved))).isEmpty();
      // 재방문이 필요하다고 기록했으니 세대는 큐에 남는다
      assertThat(unitStatus()).isEqualTo("pending");
    }

    @Test
    @DisplayName("거부는 사유가 없으면 400이다")
    void refusalNeedsReason() throws Exception {
      mvc.perform(
              submit(
                  """
              {"consentCd":"refused","revisitPlanCd":"revisit"}
              """))
          .andExpect(status().isBadRequest())
          .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
          .andExpect(
              jsonPath("$.message")
                  .value(org.hamcrest.Matchers.containsString("refusalReasonCode")));
    }
  }

  @Nested
  @DisplayName("G-1. 멱등 재전송")
  class Idempotency {

    @Test
    @DisplayName("같은 키로 다시 보내면 409가 아니라 기존 결과를 200으로 돌려준다")
    void replaysInsteadOfConflict() throws Exception {
      String key = UUID.randomUUID().toString();
      String body =
          """
          {"consentCd":"vacant","revisitPlanCd":"revisit","note":"부재"}
          """;

      MvcResult first =
          mvc.perform(submit(body).header("Idempotency-Key", key))
              .andExpect(status().isCreated())
              .andExpect(jsonPath("$.data.replay").value(false))
              .andReturn();

      mvc.perform(submit(body).header("Idempotency-Key", key))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.data.replay").value(true))
          .andExpect(jsonPath("$.data.visitId").value(visitId(first)));

      Integer rows =
          jdbc.sql("SELECT count(*) FROM visits WHERE unit_id = :id")
              .param("id", b2FieldUnit)
              .query(Integer.class)
              .single();
      assertThat(rows).isEqualTo(1);
    }

    @Test
    @DisplayName("UUID가 아닌 키는 400이다 — 조용히 무시하면 재전송이 중복 저장이 된다")
    void rejectsMalformedKey() throws Exception {
      mvc.perform(
              submit(
                      """
                  {"consentCd":"vacant","revisitPlanCd":"revisit"}
                  """)
                  .header("Idempotency-Key", "not-a-uuid"))
          .andExpect(status().isBadRequest())
          .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }
  }

  @Nested
  @DisplayName("G-1. 검증 경계")
  class Validation {

    @Test
    @DisplayName("CHECK 열거값(ck_v_rev)을 벗어난 값은 400이다 — DB까지 가지 않는다")
    void rejectsUnknownEnum() throws Exception {
      mvc.perform(
              submit(
                  """
              {"consentCd":"vacant","revisitPlanCd":"maybe"}
              """))
          .andExpect(status().isBadRequest())
          .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    @DisplayName("교체 개수가 실 개수를 넘으면(ck_v_rpc) 400이다")
    void rejectsReplaceCountOverRoomCount() throws Exception {
      mvc.perform(
              submit(
                  """
                  {"consentCd":"accepted","respondentTypeCd":"owner","roomCount":1,
                   "mfgYm":"%s","replaceCount":2,
                   "replacements":[{"replaceReasonCd":"detached"},{"replaceReasonCd":"detached"}],
                   "extinguisherInstalledCd":"installed","rxDoneCd":"done",
                   "revisitPlanCd":"not-needed"}
                  """
                      .formatted(recentMfgYm())))
          .andExpect(status().isBadRequest())
          .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    @DisplayName("경과 세대를 교체·재방문 없이 종료하려면(ck_v_norev) 사유가 필요하다")
    void expiredWithoutActionNeedsReason() throws Exception {
      mvc.perform(
              submit(
                  """
                  {"consentCd":"accepted","respondentTypeCd":"owner","roomCount":2,
                   "mfgYm":"2005-01","extinguisherInstalledCd":"installed",
                   "rxDoneCd":"advised-only","revisitPlanCd":"not-needed"}
                  """))
          .andExpect(status().isBadRequest())
          .andExpect(
              jsonPath("$.message").value(org.hamcrest.Matchers.containsString("noRevisitNote")));
    }

    @Test
    @DisplayName("lookup에 없는 코드값은 422다 — 형식이 아니라 정의의 문제다")
    void rejectsUnknownLookupCode() throws Exception {
      mvc.perform(
              submit(
                  """
              {"consentCd":"maybe-later","revisitPlanCd":"revisit"}
              """))
          .andExpect(status().isUnprocessableContent())
          .andExpect(jsonPath("$.code").value("DOMAIN_CODE_INVALID"));
    }

    @Test
    @DisplayName("없는 세대에 저장하면 404다")
    void unknownUnitIsNotFound() throws Exception {
      mvc.perform(
              post("/api/v1/units/{id}/visits", 999_999L)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(
                      """
                      {"consentCd":"vacant","revisitPlanCd":"revisit"}
                      """)
                  .with(officer()))
          .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("토큰이 없으면 401이다")
    void requiresToken() throws Exception {
      mvc.perform(
              post("/api/v1/units/{id}/visits", b2FieldUnit)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(
                      """
                      {"consentCd":"vacant","revisitPlanCd":"revisit"}
                      """))
          .andExpect(status().isUnauthorized());
    }
  }

  /* ------------------------------ 픽스처 ------------------------------ */

  private MockHttpServletRequestBuilder submit(String body) {
    return post("/api/v1/units/{id}/visits", b2FieldUnit)
        .contentType(MediaType.APPLICATION_JSON)
        .content(body)
        .with(officer());
  }

  /** 오늘로부터 1년 전 — 어느 날 돌려도 내용연수 안쪽이라 자동 전량 교체로 넘어가지 않는다. */
  private String recentMfgYm() {
    LocalDate month = LocalDate.now(clock).minusYears(1);
    return "%04d-%02d".formatted(month.getYear(), month.getMonthValue());
  }

  /** 방문일 — 서버와 같은 시계 사용. JVM 기본 시간대로 대체하면 UTC CI에서만 하루 어긋나 깨짐(로컬 KST는 재현 안 됨). */
  private String today() {
    return LocalDate.now(clock).format(DateTimeFormatter.BASIC_ISO_DATE);
  }

  private static long visitId(MvcResult result) throws Exception {
    Number id =
        com.jayway.jsonpath.JsonPath.read(
            result.getResponse().getContentAsString(), "$.data.visitId");
    return id.longValue();
  }

  private Map<String, Object> visitRow(long visitId) {
    em.flush();
    return jdbc.sql("SELECT * FROM visits WHERE visit_id = :id")
        .param("id", visitId)
        .query()
        .singleRow();
  }

  private List<Map<String, Object>> itemRows(long visitId) {
    em.flush();
    return jdbc.sql("SELECT * FROM replacement_items WHERE visit_id = :id ORDER BY item_seq")
        .param("id", visitId)
        .query()
        .listOfRows();
  }

  private String unitStatus() {
    em.flush();
    return jdbc.sql("SELECT status_cd FROM units WHERE unit_id = :id")
        .param("id", b2FieldUnit)
        .query(String.class)
        .single();
  }

  private static void assertSmallint(Map<String, Object> row, String key, int expected) {
    assertThat(((Number) row.get(key)).intValue()).isEqualTo(expected);
  }
}
