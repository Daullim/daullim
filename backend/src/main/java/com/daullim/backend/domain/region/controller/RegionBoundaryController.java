package com.daullim.backend.domain.region.controller;

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
 * B1 동 선택 지도 — 행정동 경계 정적 GeoJSON 서빙.
 *
 * <p>경계 원본은 admdongkor 2025-07-01판이고, 파이프라인 시연 지역 33개 동만 {@code adm_cd2}(행정표준 10자리)로 잘라 둔다. 화면은
 * {@code sigungu_cd}/{@code dong_cd} 속성으로 필터하고 선택 강조를 한다.
 *
 * <p>봉투({@code ApiResponse})로 감싸지 않는다 — GeoJSON은 그 자체가 표준 문서 형식이고 지도 라이브러리가 바로 먹는다.
 */
@Tag(name = "지역", description = "지역 셀렉터 3단 — 코드는 행정표준코드")
@RestController
public class RegionBoundaryController {

  private static final String RESOURCE = "admin-dong-boundaries.geojson";
  private static final MediaType GEO_JSON = MediaType.valueOf("application/geo+json");

  /** 행정동 경계는 데모 리전 갱신 전까지 고정이라 길게 잡는다. */
  private static final Duration MAX_AGE = Duration.ofHours(24);

  /** 33개 동 · 약 230KB — 기동 시 한 번 읽어 들고 있는다. */
  private final byte[] geoJson;

  RegionBoundaryController() {
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
      summary = "행정동 경계 조회",
      description = "B1 동 선택 지도에 그릴 행정동 경계 정적 GeoJSON. 화면은 sigungu_cd/dong_cd 속성으로 필터한다.")
  @GetMapping(value = "/api/v1/regions/boundaries", produces = "application/geo+json")
  public ResponseEntity<byte[]> boundaries() {
    return ResponseEntity.ok()
        .contentType(GEO_JSON)
        .cacheControl(CacheControl.maxAge(MAX_AGE).cachePublic())
        .body(geoJson);
  }
}
