package com.daullim.backend.common.response;

import com.daullim.backend.common.error.ErrorCode;

/** 공통 응답 형식 */
public record ApiResponse<T>(String code, String message, T data) {

  private static final String SUCCESS_CODE = "SUCCESS";
  private static final String SUCCESS_MESSAGE = "요청을 처리했습니다.";

  public static <T> ApiResponse<T> ok(T data) {
    return new ApiResponse<>(SUCCESS_CODE, SUCCESS_MESSAGE, data);
  }

  public static ApiResponse<Void> ok() {
    return new ApiResponse<>(SUCCESS_CODE, SUCCESS_MESSAGE, null);
  }

  public static ApiResponse<Void> error(ErrorCode errorCode) {
    return new ApiResponse<>(errorCode.name(), errorCode.getMessage(), null);
  }

  public static ApiResponse<Void> error(ErrorCode errorCode, String message) {
    return new ApiResponse<>(errorCode.name(), message, null);
  }
}
