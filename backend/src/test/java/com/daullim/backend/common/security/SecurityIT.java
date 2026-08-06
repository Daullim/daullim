package com.daullim.backend.common.security;

import static org.assertj.core.api.Assertions.assertThat;

import com.daullim.backend.TestcontainersConfiguration;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

/**
 * TestRestTemplate은 spring-boot-restclient를 요구하는데 그 의존성이 없어 JDK HttpClient로 실제 포트를 때린다. 톰캣을 그대로
 * 태우므로 ERROR 디스패치 재인가 같은 필터 체인 거동까지 검증된다.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    // 프로덕션 도메인 1개 + Vercel preview 패턴.
    properties =
        "app.cors.allowed-origins=http://localhost:5173,https://daullim-*-xyunals-projects.vercel.app")
class SecurityIT {

  /** 아직 컨트롤러가 없어 보호 여부만 본다. 인가를 통과하면 핸들러가 없어 404가 된다. */
  private static final String PROTECTED_PATH = "/api/any-protected-path";

  @Value("${local.server.port}")
  int port;

  @Autowired JwtTokenProvider tokenProvider;

  private final HttpClient client = HttpClient.newHttpClient();

  @Test
  @DisplayName("토큰 없이 보호 경로에 오면 401을 봉투로 돌려준다")
  void missingTokenReturns401Envelope() throws Exception {
    HttpResponse<String> res = send(request(PROTECTED_PATH).GET());

    assertThat(res.statusCode()).isEqualTo(401);
    assertThat(res.body()).contains("\"code\":\"UNAUTHORIZED\"", "\"data\":null");
  }

  @Test
  @DisplayName("서명이 깨진 토큰도 401을 봉투로 돌려준다")
  void invalidTokenReturns401Envelope() throws Exception {
    HttpResponse<String> res =
        send(request(PROTECTED_PATH).header("Authorization", "Bearer not-a-real-token").GET());

    assertThat(res.statusCode()).isEqualTo(401);
    assertThat(res.body()).contains("\"code\":\"UNAUTHORIZED\"");
  }

  @Test
  @DisplayName("발급한 토큰은 인가를 통과한다")
  void issuedTokenPassesAuthorization() throws Exception {
    String token = tokenProvider.issue(1L, "kim01", "officer");

    HttpResponse<String> res =
        send(request(PROTECTED_PATH).header("Authorization", "Bearer " + token).GET());

    // 401이 아니라 404라는 것이 통과의 증거다. ERROR 디스패치가 재인가되지 않는다는 뜻이기도 하다.
    assertThat(res.statusCode()).isEqualTo(404);
  }

  @Test
  @DisplayName("헬스체크는 토큰 없이 열려 있다")
  void healthIsPublic() throws Exception {
    HttpResponse<String> res = send(request("/actuator/health").GET());

    assertThat(res.statusCode()).isEqualTo(200);
    assertThat(res.body()).contains("UP");
  }

  @Test
  @DisplayName("헬스 외 액추에이터는 막혀 있다")
  void otherActuatorEndpointsAreBlocked() throws Exception {
    assertThat(send(request("/actuator/env").GET()).statusCode()).isNotEqualTo(200);
  }

  @Test
  @DisplayName("API 문서는 토큰 없이 열려 있고 JWT 인증 스킴을 노출한다")
  void apiDocsArePublic() throws Exception {
    HttpResponse<String> res = send(request("/v3/api-docs").GET());

    assertThat(res.statusCode()).isEqualTo(200);
    assertThat(res.body())
        .contains("\"title\":\"다울림 API\"", "bearerAuth", "\"bearerFormat\":\"JWT\"");
  }

  @Test
  @DisplayName("Swagger UI도 토큰 없이 열려 있다")
  void swaggerUiIsPublic() throws Exception {
    HttpResponse<String> res = send(request("/swagger-ui/index.html").GET());

    assertThat(res.statusCode()).isEqualTo(200);
  }

  @Test
  @DisplayName("허용 오리진의 프리플라이트가 통과한다")
  void corsPreflightPasses() throws Exception {
    HttpResponse<String> res = preflight("http://localhost:5173");

    assertThat(res.statusCode()).isEqualTo(200);
    assertThat(res.headers().firstValue("Access-Control-Allow-Origin"))
        .contains("http://localhost:5173");
  }

  @Test
  @DisplayName("허용하지 않은 오리진의 프리플라이트는 거절된다")
  void corsPreflightFromUnknownOriginIsRejected() throws Exception {
    HttpResponse<String> res = preflight("https://evil.example.com");

    assertThat(res.statusCode()).isEqualTo(403);
    assertThat(res.headers().firstValue("Access-Control-Allow-Origin")).isEmpty();
  }

  @Test
  @DisplayName("Vercel preview 오리진은 패턴으로 통과한다")
  void corsPreflightFromPreviewOriginPasses() throws Exception {
    String preview = "https://daullim-3v5nvrn9d-xyunals-projects.vercel.app";

    HttpResponse<String> res = preflight(preview);

    assertThat(res.statusCode()).isEqualTo(200);
    assertThat(res.headers().firstValue("Access-Control-Allow-Origin")).contains(preview);
  }

  @Test
  @DisplayName("패턴을 흉내 낸 다른 도메인은 거절된다")
  void corsPreflightFromLookalikeOriginIsRejected() throws Exception {
    HttpResponse<String> res =
        preflight("https://daullim-x-xyunals-projects.vercel.app.attacker.example");

    assertThat(res.statusCode()).isEqualTo(403);
    assertThat(res.headers().firstValue("Access-Control-Allow-Origin")).isEmpty();
  }

  private HttpResponse<String> preflight(String origin) throws Exception {
    return send(
        request(PROTECTED_PATH)
            .header("Origin", origin)
            .header("Access-Control-Request-Method", "POST")
            .method("OPTIONS", HttpRequest.BodyPublishers.noBody()));
  }

  private HttpRequest.Builder request(String path) {
    return HttpRequest.newBuilder(URI.create("http://localhost:" + port + path));
  }

  private HttpResponse<String> send(HttpRequest.Builder builder)
      throws IOException, InterruptedException {
    return client.send(builder.build(), HttpResponse.BodyHandlers.ofString());
  }
}
