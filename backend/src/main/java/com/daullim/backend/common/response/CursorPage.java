package com.daullim.backend.common.response;

import java.util.List;

/** 커서 페이지네이션 응답. 마지막 페이지면 {@code nextCursor}가 null이다. */
public record CursorPage<T>(List<T> items, String nextCursor) {}
