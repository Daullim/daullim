package com.daullim.backend.domain.building;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.daullim.backend.domain.QueryApiSupport;
import com.daullim.backend.domain.building.service.QueueCursor;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

/** E-1 우선순위 큐 · E-2 건물 상세. */
class BuildingApiIT extends QueryApiSupport {

  @Nested
  @DisplayName("E-1. 우선순위 큐")
  class Queue {

    @Test
    @DisplayName("order_key 순으로 내려가고 세대 집계가 한 번에 붙는다")
    void ordersByOrderKeyWithUnitAggregates() throws Exception {
      mvc.perform(get("/api/v1/buildings/queue").param("dongCd", DONG).with(officer()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.data.items.length()").value(3))
          .andExpect(jsonPath("$.data.items[0].buildingId").value(b1))
          .andExpect(jsonPath("$.data.items[0].orderKey").value(1))
          .andExpect(jsonPath("$.data.items[0].unitCount").value(2))
          .andExpect(jsonPath("$.data.items[0].unitDoneCount").value(2))
          // max(units.last_inspected_day)
          .andExpect(jsonPath("$.data.items[0].lastInspectedDay").value("20260702"))
          .andExpect(jsonPath("$.data.items[1].unitDoneCount").value(0))
          .andExpect(jsonPath("$.data.items[1].lastInspectedDay").doesNotExist())
          .andExpect(jsonPath("$.data.items[2].orderKey").value(3))
          .andExpect(jsonPath("$.data.nextCursor").doesNotExist());
    }

    @Test
    @DisplayName("보급이력이 없어 basis는 '미보급'이고 installDay는 null이다")
    void reflectsRealDataShape() throws Exception {
      mvc.perform(get("/api/v1/buildings/queue").param("dongCd", DONG).with(officer()))
          .andExpect(jsonPath("$.data.items[0].basis").value("미보급 · 동선 1"))
          .andExpect(jsonPath("$.data.items[0].installDay").doesNotExist())
          .andExpect(jsonPath("$.data.items[0].rxCodeCd").value("RX-BAT"));
    }

    @Test
    @DisplayName("커서로 이어 읽으면 겹치지도 빠지지도 않는다")
    void paginatesByCursor() throws Exception {
      MvcResult first =
          mvc.perform(
                  get("/api/v1/buildings/queue")
                      .param("dongCd", DONG)
                      .param("size", "2")
                      .with(officer()))
              .andExpect(status().isOk())
              .andExpect(jsonPath("$.data.items.length()").value(2))
              .andExpect(jsonPath("$.data.nextCursor").value(QueueCursor.encode(2)))
              .andReturn();

      assertThat(first.getResponse().getContentAsString()).contains("\"orderKey\":1");

      mvc.perform(
              get("/api/v1/buildings/queue")
                  .param("dongCd", DONG)
                  .param("size", "2")
                  .param("cursor", QueueCursor.encode(2))
                  .with(officer()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.data.items.length()").value(1))
          .andExpect(jsonPath("$.data.items[0].orderKey").value(3))
          .andExpect(jsonPath("$.data.nextCursor").doesNotExist());
    }

    @Test
    @DisplayName("size는 1..100을 벗어나면 400이다")
    void rejectsOversizedPage() throws Exception {
      mvc.perform(
              get("/api/v1/buildings/queue")
                  .param("dongCd", DONG)
                  .param("size", "101")
                  .with(officer()))
          .andExpect(status().isBadRequest())
          .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    @DisplayName("gridId는 1km으로 받아 500m 저장값과 매칭한다")
    void filtersByDerived1kmGrid() throws Exception {
      mvc.perform(
              get("/api/v1/buildings/queue")
                  .param("dongCd", DONG)
                  .param("gridId", "다사4641")
                  .with(officer()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.data.items.length()").value(2))
          .andExpect(jsonPath("$.data.items[0].buildingId").value(b1))
          .andExpect(jsonPath("$.data.items[1].buildingId").value(b2));

      // 500m 코드를 그대로 주면 아무것도 안 잡힌다 — FE가 1km을 넘겨야 한다는 증거
      mvc.perform(
              get("/api/v1/buildings/queue")
                  .param("dongCd", DONG)
                  .param("gridId", "다사46a41a")
                  .with(officer()))
          .andExpect(jsonPath("$.data.items.length()").value(0));
    }

    @Test
    @DisplayName("주소 검색은 서버가 공백을 지운 뒤 매칭한다")
    void searchesAddressIgnoringWhitespace() throws Exception {
      mvc.perform(
              get("/api/v1/buildings/queue")
                  .param("dongCd", DONG)
                  .param("q", "신림로 1")
                  .with(officer()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.data.items.length()").value(1))
          .andExpect(jsonPath("$.data.items[0].buildingId").value(b1));

      // LIKE 메타문자는 이스케이프된다 — '%'가 전체 매칭이 되면 안 된다
      mvc.perform(
              get("/api/v1/buildings/queue").param("dongCd", DONG).param("q", "%").with(officer()))
          .andExpect(jsonPath("$.data.items.length()").value(0));
    }

    @Test
    @DisplayName("깨진 커서는 400이다")
    void rejectsBrokenCursor() throws Exception {
      mvc.perform(
              get("/api/v1/buildings/queue")
                  .param("dongCd", DONG)
                  .param("cursor", "not-a-cursor")
                  .with(officer()))
          .andExpect(status().isBadRequest())
          .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }
  }

  @Nested
  @DisplayName("E-2. 건물 상세")
  class Detail {

    @Test
    @DisplayName("상세는 대장 프리필과 점수 근거를 함께 내린다")
    void detail() throws Exception {
      mvc.perform(get("/api/v1/buildings/{id}", b1).with(officer()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.data.buildingId").value(b1))
          .andExpect(jsonPath("$.data.houseTypeCd").value("multi-unit"))
          .andExpect(jsonPath("$.data.floorCount").value(3))
          .andExpect(jsonPath("$.data.useAprDay").value("20011019"))
          .andExpect(jsonPath("$.data.scoreVersion").value("v0-20260805"))
          .andExpect(jsonPath("$.data.computedAt").exists())
          // 통합 대장이 없어 확정적으로 비는 세 필드
          .andExpect(jsonPath("$.data.installDay").doesNotExist())
          .andExpect(jsonPath("$.data.installYear").doesNotExist())
          .andExpect(jsonPath("$.data.detectorModel").doesNotExist());
    }

    @Test
    @DisplayName("사용승인일이 없는 건물은 null로 내려 FE '미등재' 분기를 살린다")
    void keepsMissingUseAprDayNull() throws Exception {
      mvc.perform(get("/api/v1/buildings/{id}", b2).with(officer()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.data.useAprDay").doesNotExist())
          .andExpect(jsonPath("$.data.isEstimated").value(true));
    }

    @Test
    @DisplayName("없는 건물은 404 봉투다")
    void notFound() throws Exception {
      mvc.perform(get("/api/v1/buildings/{id}", 999_999L).with(officer()))
          .andExpect(status().isNotFound())
          .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }
  }
}
