package com.daullim.backend.domain.dashboard;

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
    mvc.perform(get("/api/v1/dashboard/summary").param("sigunguCd", SIGUNGU).with(officer()))
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
    mvc.perform(get("/api/v1/dashboard/summary").with(officer()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.targetCount").value(6));
  }

  @Test
  @DisplayName("예상 소요는 미완료 세대를 처방 코드로 묶고 0건 코드도 채운다")
  void pendingByRxCode() throws Exception {
    mvc.perform(get("/api/v1/dashboard/summary").param("sigunguCd", SIGUNGU).with(officer()))
        .andExpect(status().isOk())
        // B2(RX-IOT)의 2호만 해당 — B1은 완료, B3·B4는 처방이 없어 셀 근거가 없다
        .andExpect(jsonPath("$.data.pendingByRxCode['RX-IOT']").value(2))
        .andExpect(jsonPath("$.data.pendingByRxCode['RX-BAT']").value(0));
  }

  @Test
  @DisplayName("산출 시각과 응답 시각은 서로 다른 축이라 둘 다 내려간다")
  void exposesComputedAtBesideUpdatedAt() throws Exception {
    mvc.perform(get("/api/v1/dashboard/summary").param("sigunguCd", SIGUNGU).with(officer()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.computedAt").exists())
        .andExpect(jsonPath("$.data.updatedAt").exists());
  }

  @Test
  @DisplayName("건물이 없는 시군구는 computedAt이 null이다")
  void nullComputedAtWhenNoBuilding() throws Exception {
    mvc.perform(get("/api/v1/dashboard/summary").param("sigunguCd", "11680").with(officer()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.targetCount").value(0))
        .andExpect(jsonPath("$.data.computedAt").value((Object) null))
        .andExpect(jsonPath("$.data.pendingByRxCode['RX-IOT']").value(0));
  }

  @Test
  @DisplayName("위험 구성은 건물 축과 세대 축을 함께 내린다")
  void composition() throws Exception {
    mvc.perform(get("/api/v1/dashboard/composition").param("sigunguCd", SIGUNGU).with(officer()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.byRiskLevel[0].code").value("danger"))
        .andExpect(jsonPath("$.data.byRiskLevel[0].buildingCount").value(2))
        .andExpect(jsonPath("$.data.byRiskLevel[0].unitCount").value(3))
        .andExpect(jsonPath("$.data.byRiskLevel[1].code").value("warn"))
        .andExpect(jsonPath("$.data.byRiskLevel[1].buildingCount").value(1))
        .andExpect(jsonPath("$.data.byRiskLevel[1].unitCount").value(2))
        .andExpect(jsonPath("$.data.byRiskLevel[2].code").value("ok"))
        .andExpect(jsonPath("$.data.byRiskLevel[2].buildingCount").value(1))
        .andExpect(jsonPath("$.data.byRiskLevel[2].unitCount").value(1))
        .andExpect(jsonPath("$.data.estimatedBuildingCount").value(2));
  }

  @Test
  @DisplayName("위험 구성은 도농·주택유형·연대·상대위험도 분포를 내린다")
  void compositionBreakdowns() throws Exception {
    mvc.perform(get("/api/v1/dashboard/composition").param("sigunguCd", SIGUNGU).with(officer()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.byRegionType[?(@.code=='URBAN')].danger").value(1))
        .andExpect(jsonPath("$.data.byRegionType[?(@.code=='URBAN')].warn").value(1))
        .andExpect(jsonPath("$.data.byRegionType[?(@.code=='URBAN')].ok").value(0))
        .andExpect(jsonPath("$.data.byRegionType[?(@.code=='BUFFER')].danger").value(1))
        .andExpect(jsonPath("$.data.byHouseType[?(@.code=='detached')].buildingCount").value(2))
        .andExpect(jsonPath("$.data.byHouseType[?(@.code=='multi-family')].unitCount").value(2))
        .andExpect(jsonPath("$.data.byUseAprDecade[?(@.decade==1990)].buildingCount").value(1))
        .andExpect(jsonPath("$.data.byUseAprDecade[?(@.decade==2000)].buildingCount").value(1))
        .andExpect(jsonPath("$.data.byUseAprDecade[?(@.decade==null)].buildingCount").value(2))
        .andExpect(jsonPath("$.data.rrDistribution.min").value(2.0))
        .andExpect(jsonPath("$.data.rrDistribution.p50").value(6.5))
        .andExpect(jsonPath("$.data.rrDistribution.p99").value(9.07))
        .andExpect(jsonPath("$.data.rrDistribution.max").value(9.12));
  }

  @Test
  @DisplayName("건물이 없는 관할은 위험 구성의 분포값이 null이다")
  void compositionWithoutBuilding() throws Exception {
    mvc.perform(get("/api/v1/dashboard/composition").param("sigunguCd", "11680").with(officer()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.byRiskLevel[0].buildingCount").value(0))
        .andExpect(jsonPath("$.data.byRegionType.length()").value(0))
        .andExpect(jsonPath("$.data.byHouseType.length()").value(0))
        .andExpect(jsonPath("$.data.byUseAprDecade.length()").value(0))
        .andExpect(jsonPath("$.data.rrDistribution.min").value((Object) null))
        .andExpect(jsonPath("$.data.estimatedBuildingCount").value(0));
  }
}
