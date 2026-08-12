package com.daullim.backend.domain.dashboard.repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class DashboardQueryRepository {

  /** {@code %s}에 시군구 필터가 들어간다 — 없으면 전 지역이다. */
  private static final String SUMMARY_SQL =
      """
      SELECT
        (SELECT count(*) FROM units u JOIN buildings b ON b.building_id = u.building_id
          WHERE %1$s) AS target_count,
        (SELECT count(*) FROM units u JOIN buildings b ON b.building_id = u.building_id
          WHERE u.status_cd = 'done' AND %1$s) AS done_count,
        (SELECT count(*) FROM buildings b
          WHERE b.risk_level_cd = 'danger' AND %1$s) AS danger_count,
        (SELECT max(b.computed_at) FROM buildings b WHERE %1$s) AS computed_at
      """;

  // 처방 없는 건물(rx_code_cd IS NULL)의 세대는 제외 — 소요를 셀 근거가 없음
  private static final String PENDING_BY_RX_SQL =
      """
      SELECT b.rx_code_cd, count(*) AS pending_count
      FROM units u
      JOIN buildings b ON b.building_id = u.building_id
      WHERE u.status_cd <> 'done' AND b.rx_code_cd IS NOT NULL AND %1$s
      GROUP BY b.rx_code_cd
      """;

  private static final String NO_FILTER = "true";
  private static final String SIGUNGU_FILTER = "b.sigungu_cd = :sigunguCd";

  private final JdbcClient jdbc;

  DashboardQueryRepository(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  /**
   * 세대 기준 대상·완료와 건물 기준 위험 건수.
   *
   * @param computedAt 점수 산출 시각 — 응답 생성 시각(updatedAt)과 다른 축, 건물 없으면 null
   */
  public record Counts(long targetCount, long doneCount, long dangerCount, Instant computedAt) {}

  public Counts summarize(String sigunguCd) {
    return bind(SUMMARY_SQL, sigunguCd)
        .query(
            (rs, rowNum) ->
                new Counts(
                    rs.getLong("target_count"),
                    rs.getLong("done_count"),
                    rs.getLong("danger_count"),
                    Optional.ofNullable(rs.getTimestamp("computed_at"))
                        .map(Timestamp::toInstant)
                        .orElse(null)))
        .single();
  }

  /** 미완료 세대의 처방 코드별 수 — 0건 코드는 담기지 않아 호출부가 채움. */
  public Map<String, Long> pendingCountByRxCode(String sigunguCd) {
    return bind(PENDING_BY_RX_SQL, sigunguCd).query().listOfRows().stream()
        .collect(
            Collectors.toMap(
                row -> (String) row.get("rx_code_cd"),
                row -> ((Number) row.get("pending_count")).longValue(),
                (a, b) -> a,
                LinkedHashMap::new));
  }

  private JdbcClient.StatementSpec bind(String sqlTemplate, String sigunguCd) {
    String sql = sqlTemplate.formatted(sigunguCd == null ? NO_FILTER : SIGUNGU_FILTER);
    JdbcClient.StatementSpec spec = jdbc.sql(sql);
    return sigunguCd == null ? spec : spec.param("sigunguCd", sigunguCd);
  }
}
