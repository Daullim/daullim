package com.daullim.backend.domain.grid.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.DigestUtils;
import org.springframework.util.StreamUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** D-1 격자 위험지도 — 정적 GeoJSON 서빙, DB 미조회(ADR-003 §4) */
@Tag(name = "지도", description = "격자 집계")
@RestController
public class GridGeoJsonController {

  private static final String RESOURCE = "grids.geojson";
  private static final MediaType GEO_JSON = MediaType.valueOf("application/geo+json");

  /** 시연 지역 전체 격자 — 기동 시 한 번 읽어 들고 있는다. */
  private final byte[] geoJson;

  /** 내용 해시 — 파이프라인이 다시 뽑으면 값이 바뀌어 브라우저가 새 파일을 받는다. */
  private final String etag;

  GridGeoJsonController() {
    try {
      this.geoJson =
          StreamUtils.copyToString(
                  new ClassPathResource(RESOURCE).getInputStream(), StandardCharsets.UTF_8)
              .getBytes(StandardCharsets.UTF_8);
    } catch (IOException e) {
      throw new UncheckedIOException(RESOURCE + "를 읽지 못했다", e);
    }
    this.etag = "\"" + DigestUtils.md5DigestAsHex(geoJson) + "\"";
  }

  /**
   * 경계 GeoJSON과 같은 이유로 만료 캐시(`max-age`)를 쓰지 않는다 — 시연 지역이 늘면 이 파일도 다시 뽑히는데, 브라우저가 만료 전까지 서버에 묻지 않아 새
   * 지역 격자가 조용히 빈다 (2026-08-13 경계에서 실제로 겪었다). `no-cache`는 "쓰기 전에 물어봐라"라서 안 바뀌었으면 304 + 본문 0바이트로 끝난다.
   *
   * @return GeoJSON 원본 (ApiResponse 봉투 미사용). 조건부 GET이 맞으면 Spring이 304로 바꾼다.
   */
  @Operation(
      summary = "격자 위험지도 조회",
      description = "1km 격자 경계·평균 점수의 정적 GeoJSON. 동 필터는 /grids/summary의 gridId로 화면에서 조인한다.")
  @GetMapping(value = "/api/v1/grids", produces = "application/geo+json")
  public ResponseEntity<byte[]> grids() {
    return ResponseEntity.ok()
        .contentType(GEO_JSON)
        .eTag(etag)
        .cacheControl(CacheControl.noCache().cachePublic())
        .body(geoJson);
  }
}
