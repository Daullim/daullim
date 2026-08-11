package com.daullim.backend.common.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** API 명세 대조용 Swagger 설정 (정본은 openapi.yaml) */
@Configuration
public class OpenApiConfig {

  private static final String BEARER = "bearerAuth";

  @Bean
  OpenAPI openApi() {
    return new OpenAPI()
        .info(new Info().title("다울림 API").description("소방 취약가구 화재경보기 사후관리").version("v1"))
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
