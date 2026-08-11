package com.daullim.backend.domain.user.service;

import com.daullim.backend.common.error.BusinessException;
import com.daullim.backend.common.error.ErrorCode;
import com.daullim.backend.common.security.JwtTokenProvider;
import com.daullim.backend.domain.user.dto.LoginRequest;
import com.daullim.backend.domain.user.dto.LoginResponse;
import com.daullim.backend.domain.user.dto.MyInfoResponse;
import com.daullim.backend.domain.user.dto.SignupRequest;
import com.daullim.backend.domain.user.dto.SignupResponse;
import com.daullim.backend.domain.user.entity.User;
import com.daullim.backend.domain.user.repository.UserRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.Locale;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 회원 가입·로그인·탈퇴 처리 */
@Service
@Transactional(readOnly = true)
public class UserService {

  private static final String DEFAULT_ROLE_CODE = "officer";

  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtTokenProvider jwtTokenProvider;
  private final Clock clock;

  public UserService(
      UserRepository userRepository,
      PasswordEncoder passwordEncoder,
      JwtTokenProvider jwtTokenProvider,
      Clock clock) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
    this.jwtTokenProvider = jwtTokenProvider;
    this.clock = clock;
  }

  public LoginResponse login(LoginRequest request) {
    String loginId = request.loginId().trim().toLowerCase(Locale.ROOT);
    User user =
        userRepository
            .findByLoginId(loginId)
            .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));

    if (!user.isActive() || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
      throw new BusinessException(ErrorCode.UNAUTHORIZED);
    }

    String accessToken =
        jwtTokenProvider.issue(user.getId(), user.getLoginId(), user.getRoleCode());
    return LoginResponse.bearer(accessToken, jwtTokenProvider.getAccessTokenTtl().toSeconds());
  }

  public MyInfoResponse getMyInfo(Long userId) {
    User user =
        userRepository
            .findById(userId)
            .filter(User::isActive)
            .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
    return MyInfoResponse.from(user);
  }

  /**
   * 회원탈퇴 — 물리 삭제 아닌 비활성화 처리
   *
   * <p>visits.officer_id ON DELETE RESTRICT로 물리 삭제 불가, 잔여 액세스 토큰은 ActiveAccountFilter가 차단
   */
  @Transactional
  public void withdraw(Long userId) {
    User user =
        userRepository
            .findById(userId)
            .filter(User::isActive)
            .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
    user.withdraw(Instant.now(clock));
  }

  @Transactional
  public SignupResponse signup(SignupRequest request) {
    String loginId = request.loginId().trim().toLowerCase(Locale.ROOT);

    if (userRepository.existsByLoginId(loginId)) {
      throw new BusinessException(ErrorCode.CONFLICT);
    }

    User user =
        new User(
            loginId,
            passwordEncoder.encode(request.password()),
            request.name().trim(),
            formatPhone(request.phone()),
            request.birthOn(),
            DEFAULT_ROLE_CODE);

    return SignupResponse.from(userRepository.save(user));
  }

  private String formatPhone(String phone) {
    String digits = phone.replace("-", "");
    return digits.replaceAll("^(\\d{3})(\\d{3,4})(\\d{4})$", "$1-$2-$3");
  }
}
