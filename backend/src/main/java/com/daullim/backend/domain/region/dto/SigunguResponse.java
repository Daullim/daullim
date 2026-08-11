package com.daullim.backend.domain.region.dto;

/**
 * C-2 시군구 목록
 *
 * @param regionTypeCd 시군구 대표 도농값 (URBAN·RURAL 다수결, BUFFER·NO_POP 제외, 건물 없으면 null)
 */
public record SigunguResponse(String sigunguCd, String sigunguNm, String regionTypeCd) {}
