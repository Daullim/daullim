package com.daullim.backend.domain.region.controller;

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

/** B1 동 선택 지도 — 행정동 경계 정적 GeoJSON 서빙 */
@Tag(name = "지역", description = "지역 셀렉터 3단 — 코드는 행정표준코드")
@RestController
public class RegionBoundaryController {

  private static final String RESOURCE = "admin-dong-boundaries.geojson";
  private static final MediaType GEO_JSON = MediaType.valueOf("application/geo+json");

  /** 시연 지역 전체 행정동 — 기동 시 한 번 읽어 들고 있는다. */
  private final byte[] geoJson;

  /** 내용 해시 — 재절단하면 값이 바뀌어 브라우저가 새 파일을 받는다. */
  private final String etag;

  RegionBoundaryController() {
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
   * 만료 캐시(`max-age`)를 쓰지 않는다 — 이 파일은 시연 지역을 늘릴 때마다 손으로 재절단되는데, 브라우저가 만료 전까지 서버에 묻지도 않아 **새 지역만 경계가
   * 안 그려지는 사고**가 실제로 났다 (2026-08-13, 강북·고창). `no-cache`는 캐시 금지가 아니라 "쓰기 전에 물어봐라"라서 안 바뀌었으면 304 + 본문
   * 0바이트로 끝난다 — 대역폭은 지키고 신선도만 얻는다.
   *
   * @return GeoJSON 원본 (ApiResponse 봉투 미사용). 조건부 GET이 맞으면 Spring이 304로 바꾼다.
   */
  @Operation(
      summary = "행정동 경계 조회",
      description = "B1 동 선택 지도에 그릴 행정동 경계 정적 GeoJSON. 화면은 sigungu_cd/dong_cd 속성으로 필터한다.")
  @GetMapping(value = "/api/v1/regions/boundaries", produces = "application/geo+json")
  public ResponseEntity<byte[]> boundaries() {
    return ResponseEntity.ok()
        .contentType(GEO_JSON)
        .eTag(etag)
        .cacheControl(CacheControl.noCache().cachePublic())
        .body(geoJson);
  }
}
