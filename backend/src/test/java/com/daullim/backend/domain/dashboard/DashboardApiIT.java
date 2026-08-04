package com.daullim.backend.domain.dashboard;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.daullim.backend.domain.QueryApiSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** H-3 관제 요약. */
class DashboardApiIT extends QueryApiSupport {

  @Test
  @DisplayName("관제 요약은 세대 기준 대상·완료와 건물 기준 위험을 센다")
  void summary() throws Exception {
    mvc.perform(get("/api/v1/dashboard/summary").param("sigunguCd", SIGUNGU).with(jwt()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.targetCount").value(6))
        .andExpect(jsonPath("$.data.doneCount").value(2))
        // B1·B4
        .andExpect(jsonPath("$.data.dangerCount").value(2))
        .andExpect(jsonPath("$.data.updatedAt").exists());
  }

  @Test
  @DisplayName("시군구를 생략하면 전 지역을 센다")
  void summaryWithoutRegion() throws Exception {
    mvc.perform(get("/api/v1/dashboard/summary").with(jwt()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.targetCount").value(6));
  }
}
