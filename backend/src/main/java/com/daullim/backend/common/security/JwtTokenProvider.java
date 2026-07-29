package com.daullim.backend.common.security;

import java.time.Duration;
import java.time.Instant;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Component;

/** 액세스 토큰만 발급한다. 리프레시 토큰은 두지 않는다. */
@Component
public class JwtTokenProvider {

  static final String CLAIM_ROLE = "role";
  private static final String ISSUER = "daullim";

  private final JwtEncoder encoder;
  private final Duration accessTokenTtl;

  JwtTokenProvider(JwtEncoder encoder, @Value("${app.jwt.access-token-ttl}") Duration ttl) {
    this.encoder = encoder;
    this.accessTokenTtl = ttl;
  }

  public String issue(Long userId, String loginId, String roleCode) {
    Instant now = Instant.now();
    JwtClaimsSet claims =
        JwtClaimsSet.builder()
            .issuer(ISSUER)
            .issuedAt(now)
            .expiresAt(now.plus(accessTokenTtl))
            .subject(String.valueOf(userId))
            .claim("loginId", loginId)
            .claim(CLAIM_ROLE, roleCode)
            .build();
    return encoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
  }

  public Duration getAccessTokenTtl() {
    return accessTokenTtl;
  }
}
