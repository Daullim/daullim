package com.daullim.backend.common.security;

import static org.springframework.security.config.Customizer.withDefaults;

import jakarta.servlet.DispatcherType;
import java.util.List;
import org.springframework.boot.health.actuate.endpoint.HealthEndpoint;
import org.springframework.boot.security.autoconfigure.actuate.web.servlet.EndpointRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

  private static final String[] SWAGGER_PATHS = {
    "/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs", "/v3/api-docs/**"
  };

  @Bean
  SecurityFilterChain securityFilterChain(
      HttpSecurity http,
      RestAuthenticationEntryPoint entryPoint,
      RestAccessDeniedHandler accessDeniedHandler,
      JwtAuthenticationConverter jwtAuthenticationConverter,
      ActiveAccountFilter activeAccountFilter) {

    http.csrf(AbstractHttpConfigurer::disable)
        .cors(withDefaults())
        .httpBasic(AbstractHttpConfigurer::disable)
        .formLogin(AbstractHttpConfigurer::disable)
        .logout(AbstractHttpConfigurer::disable)
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(
            auth ->
                auth.dispatcherTypeMatchers(DispatcherType.ERROR, DispatcherType.FORWARD)
                    .permitAll()
                    .requestMatchers(EndpointRequest.to(HealthEndpoint.class))
                    .permitAll()
                    .requestMatchers(EndpointRequest.toAnyEndpoint())
                    .denyAll()
                    // prod springdoc 비활성화 시 404 처리 (permitAll 무해)
                    .requestMatchers(SWAGGER_PATHS)
                    .permitAll()
                    .anyRequest()
                    .authenticated())
        .oauth2ResourceServer(
            oauth ->
                oauth
                    .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter))
                    .authenticationEntryPoint(entryPoint)
                    .accessDeniedHandler(accessDeniedHandler))
        .exceptionHandling(
            ex -> ex.authenticationEntryPoint(entryPoint).accessDeniedHandler(accessDeniedHandler))
        // 인증 성립 직후 탈퇴 계정 필터링 지점
        .addFilterAfter(activeAccountFilter, BearerTokenAuthenticationFilter.class);

    return http.build();
  }

  /** 커스텀 권한 변환기 (기본 변환기는 scope 클레임만 인식) */
  @Bean
  JwtAuthenticationConverter jwtAuthenticationConverter() {
    JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
    converter.setJwtGrantedAuthoritiesConverter(
        jwt -> {
          String role = jwt.getClaimAsString(JwtTokenProvider.CLAIM_ROLE);
          return role == null
              ? List.of()
              : List.of(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()));
        });
    return converter;
  }
}
