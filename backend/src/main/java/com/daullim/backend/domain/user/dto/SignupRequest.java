package com.daullim.backend.domain.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** 회원가입 요청 데이터. */
public record SignupRequest(
    @NotBlank(message = "로그인 아이디는 필수입니다.") @Size(min = 4, max = 50, message = "로그인 아이디는 4자 이상 50자 이하여야 합니다.") String loginId,
    @NotBlank(message = "비밀번호는 필수입니다.") @Size(min = 8, max = 72, message = "비밀번호는 8자 이상 72자 이하여야 합니다.") String password,
    @NotBlank(message = "이름은 필수입니다.") @Size(max = 50, message = "이름은 50자 이하여야 합니다.") String name,
    @NotBlank(message = "전화번호는 필수입니다.") @Pattern(regexp = "^01[016789]-?\\d{3,4}-?\\d{4}$", message = "올바른 휴대전화 번호 형식이 아닙니다.") String phone,
    @NotNull(message = "생년월일은 필수입니다.") @Past(message = "생년월일은 과거 날짜여야 합니다.") LocalDate birthOn) {}
