package com.daullim.backend.domain.user.dto;

import com.daullim.backend.domain.user.entity.User;
import java.time.Instant;

/** 회원가입 성공 후 반환하는 사용자 정보. 비밀번호는 포함하지 않는다. */
public record SignupResponse(Long id, String loginId, String name, Instant createdAt) {

  public static SignupResponse from(User user) {
    return new SignupResponse(user.getId(), user.getLoginId(), user.getName(), user.getCreatedAt());
  }
}
