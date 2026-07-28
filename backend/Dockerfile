# ADR-006 — Railway 컨테이너 배포. 무료/저가 티어 메모리 대응으로 힙을 명시 제한한다.
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /workspace

COPY gradlew settings.gradle build.gradle ./
COPY gradle gradle
RUN ./gradlew --no-daemon dependencies || true

COPY src src
RUN ./gradlew --no-daemon clean bootJar -x test -x spotlessCheck

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN apk add --no-cache curl \
  && addgroup -S app && adduser -S app -G app
USER app

COPY --from=build /workspace/build/libs/*.jar app.jar

ENV SPRING_PROFILES_ACTIVE=prod
# ADR-002 결과가 지적한 JVM 풋프린트 대응 (ADR-006: -Xmx384m 수준)
ENV JAVA_OPTS="-Xmx384m -XX:MaxMetaspaceSize=128m -XX:+UseSerialGC"

EXPOSE 8080

# ADR-006 운영 4 — 시연 당일 아침 1분 점검 절차의 대상
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD curl -fsS http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
