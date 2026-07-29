package com.daullim.backend.common.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** 구현과 API 명세를 눈으로 대조하는 용도. 명세 정본은 openapi.yaml이지 이 화면이 아니다. */
@Configuration
public class OpenApiConfig {

  private static final String BEARER = "bearerAuth";

  @Bean
  OpenAPI openApi() {
    return new OpenAPI()
        .info(new Info().title("다울림 API").description("소방 취약가구 화재경보기 사후관리").version("v1"))
        // 이게 있어야 Swagger UI의 Authorize 버튼으로 토큰을 넣어 호출해볼 수 있다.
        .components(
            new Components()
                .addSecuritySchemes(
                    BEARER,
                    new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")))
        .addSecurityItem(new SecurityRequirement().addList(BEARER));
  }
}
