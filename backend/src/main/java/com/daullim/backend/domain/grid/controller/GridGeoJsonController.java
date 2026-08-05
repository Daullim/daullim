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

/**
 * D-1 격자 위험지도 — 정적 GeoJSON 서빙.
 *
 * <p><b>DB를 타지 않는다</b>(ADR-003 §4). 경계·점수는 pipeline이 {@code seed/grids.geojson}으로 산출한 정적 속성이고, 실시간
 * 방문 현황만 {@link GridController}가 따로 낸다. 그래서 이 응답은 통째로 캐시할 수 있다.
 *
 * <p>격자는 <b>1km</b>다({@code 다사4641}) — SGIS 경계가 1km만 제공되기 때문이다. 파일에 행정동 속성이 없어 여기서 동으로 거를 수 없고, 화면은
 * {@code GET /grids/summary}가 내려주는 동별 {@code gridId}로 조인해 거른다.
 *
 * <p>봉투({@code ApiResponse})로 감싸지 않는다 — GeoJSON은 그 자체가 표준 문서 형식이고 지도 라이브러리가 바로 먹는다.
 */
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
