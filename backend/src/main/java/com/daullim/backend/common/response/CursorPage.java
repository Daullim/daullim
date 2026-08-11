package com.daullim.backend.common.response;

import java.util.List;

/** 커서 페이지네이션 응답 ({@code nextCursor} null이면 마지막 페이지) */
public record CursorPage<T>(List<T> items, String nextCursor) {}
