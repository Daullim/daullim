package com.daullim.backend.domain.region.dto;

/**
 * C-2 시군구 목록.
 *
 * <p>{@code regionTypeCd}는 시군구 내 건물의 URBAN·RURAL만 센 다수값이다(BUFFER·NO_POP 제외). 도농 판별이 격자 단위라 한 시군구에
 * 여러 클래스가 공존하므로 — 임실군은 URBAN 325 · RURAL 6,839 · BUFFER 928 — 이 값은 <b>화면 모드 분기용 대표값</b>이지 개별 건물의
 * 분류가 아니다. 건물이 한 채도 없으면 null.
 */
public record SigunguResponse(String sigunguCd, String sigunguNm, String regionTypeCd) {}
