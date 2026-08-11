package com.daullim.backend.domain.user.dto;

import com.daullim.backend.domain.user.entity.User;
import java.time.Instant;

/** 회원가입 응답 — 비밀번호 미포함 */
public record SignupResponse(Long id, String loginId, String name, Instant createdAt) {

  public static SignupResponse from(User user) {
    return new SignupResponse(user.getId(), user.getLoginId(), user.getName(), user.getCreatedAt());
  }
}
