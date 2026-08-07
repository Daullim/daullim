package com.daullim.backend.domain.unit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.daullim.backend.domain.QueryApiSupport;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/** F-1 세대 목록 · F-2 현장 호수 입력. */
class UnitApiIT extends QueryApiSupport {

  @Nested
  @DisplayName("F-1. 세대 목록")
  class ListUnits {

    @Test
    @DisplayName("세대 목록은 unitSeq 순이고 미지정 호수는 null이다")
    void ordersByUnitSeq() throws Exception {
      mvc.perform(get("/api/v1/buildings/{id}/units", b2).with(officer()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.data.length()").value(2))
          .andExpect(jsonPath("$.data[0].unitSeq").value(1))
          .andExpect(jsonPath("$.data[0].hoNm").doesNotExist())
          .andExpect(jsonPath("$.data[0].hoNmSourceCd").value("field"))
          .andExpect(jsonPath("$.data[0].statusCd").value("pending"))
          .andExpect(jsonPath("$.data[1].hoNm").value("201호"));
    }

    @Test
    @DisplayName("없는 건물의 세대 목록은 404다 — 빈 배열이 아니다")
    void notFound() throws Exception {
      mvc.perform(get("/api/v1/buildings/{id}/units", 999_999L).with(officer()))
          .andExpect(status().isNotFound());
    }
  }

  @Nested
  @DisplayName("F-2. 세대 호수 수정")
  class RenameUnit {

    @Test
    @DisplayName("field 행은 수정되고 업무 상태는 건드리지 않는다")
    void renamesFieldUnit() throws Exception {
      mvc.perform(
              patch("/api/v1/units/{id}", b2FieldUnit)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"hoNm\":\"101호\"}")
                  .with(officer()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.data.hoNm").value("101호"))
          .andExpect(jsonPath("$.data.hoNmSourceCd").value("field"))
          .andExpect(jsonPath("$.data.statusCd").value("pending"))
          .andExpect(jsonPath("$.data.lastInspectedDay").doesNotExist());

      // 테스트가 트랜잭션을 붙들고 있어 커밋이 없다 — 더티 체킹 결과를 JDBC로 보려면 밀어내야 한다.
      em.flush();

      Map<String, Object> row =
          jdbc.sql(
                  """
                  SELECT ho_nm, status_cd, last_inspected_day, rx_baseline_day
                  FROM units WHERE unit_id = :id
                  """)
              .param("id", b2FieldUnit)
              .query()
              .singleRow();
      assertThat(row.get("ho_nm")).isEqualTo("101호");
      assertThat(row.get("status_cd")).isEqualTo("pending");
      assertThat(row.get("last_inspected_day")).isNull();
      assertThat(row.get("rx_baseline_day")).isNull();
    }

    @Test
    @DisplayName("대장에서 온 호수(expos)는 403이다")
    void rejectsLedgerSourcedUnit() throws Exception {
      mvc.perform(
              patch("/api/v1/units/{id}", b1ExposUnit)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"hoNm\":\"999호\"}")
                  .with(officer()))
          .andExpect(status().isForbidden())
          .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    @DisplayName("같은 건물에 있는 호수는 409다")
    void rejectsDuplicateHoNm() throws Exception {
      mvc.perform(
              patch("/api/v1/units/{id}", b2FieldUnit)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"hoNm\":\"201호\"}")
                  .with(officer()))
          .andExpect(status().isConflict())
          .andExpect(jsonPath("$.code").value("CONFLICT"));
    }

    @Test
    @DisplayName("빈 호수는 400이다")
    void rejectsBlankHoNm() throws Exception {
      mvc.perform(
              patch("/api/v1/units/{id}", b2FieldUnit)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"hoNm\":\"  \"}")
                  .with(officer()))
          .andExpect(status().isBadRequest())
          .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    @DisplayName("없는 세대는 404다")
    void notFound() throws Exception {
      mvc.perform(
              patch("/api/v1/units/{id}", 999_999L)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"hoNm\":\"101호\"}")
                  .with(officer()))
          .andExpect(status().isNotFound());
    }
  }
}
