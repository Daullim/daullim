package com.daullim.backend.domain.region.dto;

/** C-1 시도 목록 — {@code sidoCd}는 행정표준코드다(서울 11 · 전북특별자치도 52). */
public record SidoResponse(String sidoCd, String sidoNm) {}
