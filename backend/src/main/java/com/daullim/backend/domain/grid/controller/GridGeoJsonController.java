package com.daullim.backend.domain.grid.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StreamUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** D-1 격자 위험지도 — 정적 GeoJSON 서빙, DB 미조회(ADR-003 §4) */
@Tag(name = "지도", description = "격자 집계")
@RestController
public class GridGeoJsonController {

  private static final String RESOURCE = "grids.geojson";
  private static final MediaType GEO_JSON = MediaType.valueOf("application/geo+json");

  /** 파이프라인 재실행(월 1회)까지 값이 고정이라 길게 잡는다. */
  private static final Duration MAX_AGE = Duration.ofHours(24);

  /** 485격자 · 157KB — 기동 시 한 번 읽어 들고 있는다. */
  private final byte[] geoJson;

  GridGeoJsonController() {
    try {
      this.geoJson =
          StreamUtils.copyToString(
                  new ClassPathResource(RESOURCE).getInputStream(), StandardCharsets.UTF_8)
              .getBytes(StandardCharsets.UTF_8);
    } catch (IOException e) {
      throw new UncheckedIOException(RESOURCE + "를 읽지 못했다", e);
    }
  }

  /**
   * @return GeoJSON 원본 (ApiResponse 봉투 미사용)
   */
  @Operation(
      summary = "격자 위험지도 조회",
      description = "1km 격자 경계·평균 점수의 정적 GeoJSON. 동 필터는 /grids/summary의 gridId로 화면에서 조인한다.")
  @GetMapping(value = "/api/v1/grids", produces = "application/geo+json")
  public ResponseEntity<byte[]> grids() {
    return ResponseEntity.ok()
        .contentType(GEO_JSON)
        .cacheControl(CacheControl.maxAge(MAX_AGE).cachePublic())
        .body(geoJson);
  }
}
