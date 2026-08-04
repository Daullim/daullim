package com.daullim.backend.domain.user.dto;

import com.daullim.backend.domain.user.entity.User;
import java.time.LocalDate;

public record MyInfoResponse(
    Long id,
    String loginId,
    String name,
    String phone,
    LocalDate birthOn,
    String rankName,
    String titleName,
    String orgName,
    String roleCode) {

  public static MyInfoResponse from(User user) {
    return new MyInfoResponse(
        user.getId(),
        user.getLoginId(),
        user.getName(),
        user.getPhone(),
        user.getBirthOn(),
        user.getRankName(),
        user.getTitleName(),
        user.getOrgName(),
        user.getRoleCode());
  }
}
