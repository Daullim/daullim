package com.daullim.backend.domain.user.controller;

import com.daullim.backend.common.response.ApiResponse;
import com.daullim.backend.domain.user.dto.LoginRequest;
import com.daullim.backend.domain.user.dto.LoginResponse;
import com.daullim.backend.domain.user.dto.MyInfoResponse;
import com.daullim.backend.domain.user.dto.SignupRequest;
import com.daullim.backend.domain.user.dto.SignupResponse;
import com.daullim.backend.domain.user.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 로그인하지 않은 사용자가 호출하는 인증 관련 API를 제공한다. */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

  private final UserService userService;

  public AuthController(UserService userService) {
    this.userService = userService;
  }

  @PostMapping("/login")
  public ResponseEntity<ApiResponse<LoginResponse>> login(
      @Valid @RequestBody LoginRequest request) {
    return ResponseEntity.ok(ApiResponse.ok(userService.login(request)));
  }

  @GetMapping("/me")
  public ResponseEntity<ApiResponse<MyInfoResponse>> me(@AuthenticationPrincipal Jwt jwt) {
    return ResponseEntity.ok(ApiResponse.ok(userService.getMyInfo(Long.valueOf(jwt.getSubject()))));
  }

  @PostMapping("/signup")
  public ResponseEntity<ApiResponse<SignupResponse>> signup(
      @Valid @RequestBody SignupRequest request) {
    SignupResponse response = userService.signup(request);
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
  }
}
