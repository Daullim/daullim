package com.daullim.backend.domain.region;

import static org.hamcrest.Matchers.containsString;
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
  @DisplayName("시연 지역 85개 행정동 경계를 geo+json으로 내린다")
  void servesFeatureCollection() throws Exception {
    mvc.perform(get("/api/v1/regions/boundaries").with(officer()))
        .andExpect(status().isOk())
        .andExpect(content().contentTypeCompatibleWith("application/geo+json"))
        .andExpect(jsonPath("$.type").value("FeatureCollection"))
        .andExpect(jsonPath("$.features.length()").value(85));
  }

  // admdongkor 수동 재절단 파일이라 시연 지역 추가 시 조용히 뒤처짐 — 사전과 대조해 못 박음
  @Test
  @DisplayName("경계 시군구는 지역 사전의 시군구와 정확히 일치한다 — 재절단 누락 방지")
  void coversExactlyTheCatalogSigungus() throws Exception {
    mvc.perform(get("/api/v1/regions/boundaries").with(officer()))
        .andExpect(
            jsonPath("$.features[*].properties.sigungu_cd")
                .value(
                    org.hamcrest.Matchers.hasItems(
                        "11305", "11620", "26230", "26710", "52750", "52790")));
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

  // 재절단해도 브라우저가 만료 전까지 서버에 묻지 않아 새 지역 경계가 안 뜬 사고(2026-08-13)의 회귀 방지
  @Test
  @DisplayName("캐시하되 매번 검증하게 내린다 — 재절단이 즉시 반영돼야 한다")
  void revalidatesInsteadOfExpiring() throws Exception {
    mvc.perform(get("/api/v1/regions/boundaries").with(officer()))
        .andExpect(
            header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-cache")))
        .andExpect(
            header()
                .string(
                    "Cache-Control", org.hamcrest.Matchers.not(containsString("max-age=86400"))))
        .andExpect(header().exists("ETag"));
  }

  @Test
  @DisplayName("내용이 그대로면 304로 본문을 안 내린다")
  void skipsBodyWhenUnchanged() throws Exception {
    String etag =
        mvc.perform(get("/api/v1/regions/boundaries").with(officer()))
            .andReturn()
            .getResponse()
            .getHeader("ETag");

    mvc.perform(get("/api/v1/regions/boundaries").header("If-None-Match", etag).with(officer()))
        .andExpect(status().isNotModified())
        .andExpect(content().string(""));
  }

  @Test
  @DisplayName("토큰이 없으면 401이다")
  void requiresAuthentication() throws Exception {
    mvc.perform(get("/api/v1/regions/boundaries")).andExpect(status().isUnauthorized());
  }
}
