package com.daullim.backend.domain.region;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.daullim.backend.domain.QueryApiSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** C-1~C-3 지역 셀렉터 — 명칭은 사전, 집계는 DB. */
class RegionApiIT extends QueryApiSupport {

  @Test
  @DisplayName("시도는 행정표준코드로 내려간다 — 슬러그가 아니다")
  void sidos() throws Exception {
    mvc.perform(get("/api/v1/regions/sidos").with(officer()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.code").value("SUCCESS"))
        .andExpect(jsonPath("$.data[0].sidoCd").value("11"))
        .andExpect(jsonPath("$.data[0].sidoNm").value("서울특별시"))
        .andExpect(jsonPath("$.data[1].sidoCd").value("52"));
  }

  @Test
  @DisplayName("시군구 regionTypeCd는 BUFFER를 뺀 URBAN·RURAL 다수값이다")
  void sigungus() throws Exception {
    mvc.perform(get("/api/v1/regions/sigungus").param("sidoCd", SIDO).with(officer()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data[0].sigunguCd").value(SIGUNGU))
        .andExpect(jsonPath("$.data[0].sigunguNm").value("관악구"))
        // URBAN 2(B1·B2) vs RURAL 1(B3), BUFFER인 B4는 세지 않는다.
        .andExpect(jsonPath("$.data[0].regionTypeCd").value("URBAN"));
  }

  @Test
  @DisplayName("행정동은 사전 21개 전부 내려가고 가구 수는 세대·평균 위험도는 건물 기준이다")
  void dongs() throws Exception {
    mvc.perform(get("/api/v1/regions/dongs").param("sigunguCd", SIGUNGU).with(officer()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.length()").value(21))
        .andExpect(jsonPath("$.data[?(@.dongCd=='" + DONG + "')].dongNm").value("신림동"))
        // 건물 3채가 아니라 세대 5호(2+2+1)
        .andExpect(jsonPath("$.data[?(@.dongCd=='" + DONG + "')].householdCount").value(5))
        // 건물 평균 (91.20 + 55.00 + 20.00) / 3 = 55.4.
        // 세대로 가중하면 62.5가 되므로 이 값이 축이 섞이지 않았다는 증거다.
        .andExpect(jsonPath("$.data[?(@.dongCd=='" + DONG + "')].avgRiskScore").value(55.4))
        .andExpect(jsonPath("$.data[?(@.dongCd=='" + DONG + "')].avgRiskLevelCd").value("warn"))
        .andExpect(
            jsonPath("$.data[?(@.dongCd=='" + OTHER_DONG + "')].avgRiskLevelCd").value("danger"))
        // 건물이 없는 동도 셀렉터에는 떠야 한다
        .andExpect(jsonPath("$.data[?(@.dongCd=='1162052500')].householdCount").value(0));
  }

  @Test
  @DisplayName("코드 형식이 어긋나면 400이다")
  void rejectsMalformedCode() throws Exception {
    mvc.perform(get("/api/v1/regions/dongs").param("sigunguCd", "gwanak").with(officer()))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  @Test
  @DisplayName("토큰이 없으면 조회 API도 401이다")
  void requiresAuthentication() throws Exception {
    mvc.perform(get("/api/v1/regions/sidos")).andExpect(status().isUnauthorized());
  }
}
