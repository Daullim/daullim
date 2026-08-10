package com.daullim.backend.domain.region;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.daullim.backend.domain.QueryApiSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** B1 행정동 경계 정적 GeoJSON 서빙. */
class RegionBoundaryApiIT extends QueryApiSupport {

  @Test
  @DisplayName("시연 지역 58개 행정동 경계를 geo+json으로 내린다")
  void servesFeatureCollection() throws Exception {
    mvc.perform(get("/api/v1/regions/boundaries").with(officer()))
        .andExpect(status().isOk())
        .andExpect(content().contentTypeCompatibleWith("application/geo+json"))
        .andExpect(jsonPath("$.type").value("FeatureCollection"))
        .andExpect(jsonPath("$.features.length()").value(58));
  }

  /**
   * 이 파일만 {@code run_seed.py}의 산출이 아니라 admdongkor에서 손으로 잘라 온 것이라, 시연 지역이 늘어도 조용히 뒤처진다. 큐·목록은 멀쩡한데
   * 지도만 비어 보이므로 눈으로는 늦게 발견된다 — 사전(regions.csv)과 대조해 못 박는다.
   */
  @Test
  @DisplayName("경계 시군구는 지역 사전의 시군구와 정확히 일치한다 — 재절단 누락 방지")
  void coversExactlyTheCatalogSigungus() throws Exception {
    mvc.perform(get("/api/v1/regions/boundaries").with(officer()))
        .andExpect(
            jsonPath("$.features[*].properties.sigungu_cd")
                .value(org.hamcrest.Matchers.hasItems("11620", "26230", "26710", "52750")));
  }

  @Test
  @DisplayName("경계 속성은 행정표준 행정동코드와 시군구코드를 담는다")
  void carriesAdministrativeCodes() throws Exception {
    mvc.perform(get("/api/v1/regions/boundaries").with(officer()))
        .andExpect(jsonPath("$.features[0].properties.dong_cd").exists())
        .andExpect(jsonPath("$.features[0].properties.sigungu_cd").exists())
        .andExpect(jsonPath("$.features[0].properties.source").value("admdongkor-ver20250701"))
        .andExpect(
            jsonPath("$.features[0].properties.dong_cd").value(org.hamcrest.Matchers.hasLength(10)))
        .andExpect(
            jsonPath("$.features[0].properties.sigungu_cd")
                .value(org.hamcrest.Matchers.hasLength(5)));
  }

  @Test
  @DisplayName("정적 자산이라 캐시 가능하게 내린다")
  void isCacheable() throws Exception {
    mvc.perform(get("/api/v1/regions/boundaries").with(officer()))
        .andExpect(
            header()
                .string("Cache-Control", org.hamcrest.Matchers.containsString("max-age=86400")));
  }

  @Test
  @DisplayName("토큰이 없으면 401이다")
  void requiresAuthentication() throws Exception {
    mvc.perform(get("/api/v1/regions/boundaries")).andExpect(status().isUnauthorized());
  }
}
