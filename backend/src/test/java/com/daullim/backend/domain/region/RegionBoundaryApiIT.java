package com.daullim.backend.domain.region;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
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
  @DisplayName("시연 지역 33개 행정동 경계를 geo+json으로 내린다")
  void servesFeatureCollection() throws Exception {
    mvc.perform(get("/api/v1/regions/boundaries").with(jwt()))
        .andExpect(status().isOk())
        .andExpect(content().contentTypeCompatibleWith("application/geo+json"))
        .andExpect(jsonPath("$.type").value("FeatureCollection"))
        .andExpect(jsonPath("$.features.length()").value(33));
  }

  @Test
  @DisplayName("경계 속성은 행정표준 행정동코드와 시군구코드를 담는다")
  void carriesAdministrativeCodes() throws Exception {
    mvc.perform(get("/api/v1/regions/boundaries").with(jwt()))
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
    mvc.perform(get("/api/v1/regions/boundaries").with(jwt()))
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
