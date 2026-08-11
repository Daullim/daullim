package com.daullim.backend.domain.grid;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.daullim.backend.domain.QueryApiSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** D-3 격자 방문 현황. */
class GridSummaryApiIT extends QueryApiSupport {

  @Test
  @DisplayName("격자 요약은 1km으로 모아 세고 전 세대 완료만 방문으로 친다")
  void summary() throws Exception {
    mvc.perform(get("/api/v1/grids/summary").param("dongCd", DONG).with(officer()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.length()").value(2))
        .andExpect(jsonPath("$.data[0].gridId").value("다사4641"))
        .andExpect(jsonPath("$.data[0].targetCount").value(2))
        // B1만 2/2 완료, B2는 0/2
        .andExpect(jsonPath("$.data[0].visitedCount").value(1))
        .andExpect(jsonPath("$.data[1].gridId").value("다사4741"))
        .andExpect(jsonPath("$.data[1].targetCount").value(1))
        .andExpect(jsonPath("$.data[1].visitedCount").value(0));
  }

  // 같은 규칙이 자바·SQL 두 벌로 존재 — 어긋나면 화면 격자가 통째로 0건이 됨
  @Test
  @DisplayName("SQL 유도 격자와 자바 유도 격자가 같은 값을 낸다")
  void sqlAndJavaDerivationAgree() {
    jdbc.sql("SELECT grid_id, %s AS derived FROM buildings b".formatted(GridId.to1kmSql("b")))
        .query()
        .listOfRows()
        .forEach(
            row ->
                assertThat(row.get("derived"))
                    .isEqualTo(GridId.to1km((String) row.get("grid_id"))));
  }
}
