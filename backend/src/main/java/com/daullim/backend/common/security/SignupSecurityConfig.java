package com.daullim.backend.common.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;

/** 회원가입 요청만 인증 없이 처리하는 우선순위 보안 체인이다. */
@Configuration
public class SignupSecurityConfig {

  @Bean
  @Order(1)
  SecurityFilterChain signupSecurityFilterChain(HttpSecurity http) throws Exception {
    http.securityMatcher("/api/v1/auth/signup", "/api/v1/auth/login")
        .csrf(AbstractHttpConfigurer::disable)
        .cors(org.springframework.security.config.Customizer.withDefaults())
        .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
    return http.build();
  }
}
