package com.daullim.backend.domain.grid;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.daullim.backend.domain.QueryApiSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** D-1 정적 GeoJSON 서빙. */
class GridGeoJsonApiIT extends QueryApiSupport {

  @Test
  @DisplayName("1,287격자 GeoJSON을 geo+json으로 내린다")
  void servesFeatureCollection() throws Exception {
    mvc.perform(get("/api/v1/grids").with(officer()))
        .andExpect(status().isOk())
        .andExpect(content().contentTypeCompatibleWith("application/geo+json"))
        .andExpect(jsonPath("$.type").value("FeatureCollection"))
        .andExpect(jsonPath("$.features.length()").value(1287));
  }

  @Test
  @DisplayName("격자 속성은 1km 코드와 정적 위험도를 담는다")
  void carriesStaticProperties() throws Exception {
    mvc.perform(get("/api/v1/grids").with(officer()))
        .andExpect(jsonPath("$.features[0].geometry.type").value("Polygon"))
        .andExpect(jsonPath("$.features[0].properties.grid_id").exists())
        .andExpect(jsonPath("$.features[0].properties.avg_score").exists())
        .andExpect(jsonPath("$.features[0].properties.risk_level_cd").exists())
        // 1km 코드다 — 500m(8자)가 섞이면 화면이 /grids/summary와 조인되지 않는다
        .andExpect(
            jsonPath("$.features[0].properties.grid_id").value(org.hamcrest.Matchers.hasLength(6)));
  }

  // 경계 GeoJSON과 같은 사고(2026-08-13)의 회귀 방지 — 만료 캐시면 재산출이 하루 늦게 보인다
  @Test
  @DisplayName("캐시하되 매번 검증하게 내린다 — 재산출이 즉시 반영돼야 한다")
  void revalidatesInsteadOfExpiring() throws Exception {
    mvc.perform(get("/api/v1/grids").with(officer()))
        .andExpect(
            header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-cache")))
        .andExpect(
            header()
                .string(
                    "Cache-Control",
                    org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("max-age=86400"))))
        .andExpect(header().exists("ETag"));
  }

  @Test
  @DisplayName("내용이 그대로면 304로 본문을 안 내린다")
  void skipsBodyWhenUnchanged() throws Exception {
    String etag =
        mvc.perform(get("/api/v1/grids").with(officer()))
            .andReturn()
            .getResponse()
            .getHeader("ETag");

    mvc.perform(get("/api/v1/grids").header("If-None-Match", etag).with(officer()))
        .andExpect(status().isNotModified())
        .andExpect(content().string(""));
  }

  @Test
  @DisplayName("토큰이 없으면 401이다")
  void requiresAuthentication() throws Exception {
    mvc.perform(get("/api/v1/grids")).andExpect(status().isUnauthorized());
  }
}
