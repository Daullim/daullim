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

/** 탈퇴 계정 토큰 차단 필터 */
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
    // 액세스 토큰 stateless라 취소 불가 — 요청마다 계정 생존 확인으로 잔여 TTL 접근 차단
    if (auth instanceof JwtAuthenticationToken token && !isActive(token)) {
      // 컨텍스트 초기화로 익명 재해석 방지, 401 응답은 엔트리포인트로 일원화
      SecurityContextHolder.clearContext();
      entryPoint.commence(request, response, new InsufficientAuthenticationException("비활성 계정입니다."));
      return;
    }
    chain.doFilter(request, response);
  }

  /** sub 클레임 = user_id (숫자 아니면 미발급 토큰으로 간주 후 거부) */
  private boolean isActive(JwtAuthenticationToken token) {
    long userId;
    try {
      userId = Long.parseLong(token.getToken().getSubject());
    } catch (NumberFormatException e) {
      return false;
    }
    // 요청당 PK 조회 1회 — 리프레시 토큰 미사용으로 TTL 단축 불가, 이 비용이 최선
    return users.existsByIdAndActiveIsTrue(userId);
  }
}
