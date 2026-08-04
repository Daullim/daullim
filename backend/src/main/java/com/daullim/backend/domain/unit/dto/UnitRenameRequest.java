package com.daullim.backend.domain.unit.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** F-2 요청 — 다가구 현장 호수 입력. 업무 상태(status·점검일·재산입 기준일)는 이 경로로 바뀌지 않는다. */
public record UnitRenameRequest(
    @NotBlank(message = "호수를 입력하세요.") @Size(max = 20, message = "호수는 20자 이하입니다.") String hoNm) {}
