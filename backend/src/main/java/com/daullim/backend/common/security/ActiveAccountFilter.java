package com.daullim.backend.common.security;

import com.daullim.backend.domain.user.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * 탈퇴한 계정의 토큰을 막는다.
 *
 * <p>액세스 토큰은 stateless라 발급 후에는 취소할 수단이 없다. 서명·만료만 보면 탈퇴한 사용자가 남은 TTL(최대 1시간) 동안 조회 API를 그대로 쓴다 — 탈퇴
 * 다이얼로그가 "되돌릴 수 없습니다"라고 말한 것과 어긋난다. 요청마다 계정이 살아 있는지 확인해 그 창을 닫는다.
 *
 * <p>비용은 PK 조회 1회다. 리프레시 토큰이 없어 TTL을 더 줄일 수도 없으므로 이쪽이 싸다.
 */
@Component
public class ActiveAccountFilter extends OncePerRequestFilter {

  private final UserRepository users;
  private final RestAuthenticationEntryPoint entryPoint;

  ActiveAccountFilter(UserRepository users, RestAuthenticationEntryPoint entryPoint) {
    this.users = users;
    this.entryPoint = entryPoint;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {

    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth instanceof JwtAuthenticationToken token && !isActive(token)) {
      // 다음 필터가 익명으로 재해석하지 않도록 비우고, 401 봉투는 엔트리포인트 한 곳에서만 쓴다.
      SecurityContextHolder.clearContext();
      entryPoint.commence(request, response, new InsufficientAuthenticationException("비활성 계정입니다."));
      return;
    }
    chain.doFilter(request, response);
  }

  /** sub는 우리가 발급할 때 넣은 user_id다. 숫자가 아니면 우리 토큰이 아니므로 통과시키지 않는다. */
  private boolean isActive(JwtAuthenticationToken token) {
    long userId;
    try {
      userId = Long.parseLong(token.getToken().getSubject());
    } catch (NumberFormatException e) {
      return false;
    }
    return users.existsByIdAndActiveIsTrue(userId);
  }
}
