package com.daullim.backend.domain.dashboard.repository;

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
          WHERE b.risk_level_cd = 'danger' AND %1$s) AS danger_count
      """;

  private static final String NO_FILTER = "true";
  private static final String SIGUNGU_FILTER = "b.sigungu_cd = :sigunguCd";

  private final JdbcClient jdbc;

  DashboardQueryRepository(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  /** 세대 기준 대상·완료와 건물 기준 위험 건수. */
  public record Counts(long targetCount, long doneCount, long dangerCount) {}

  public Counts summarize(String sigunguCd) {
    String sql = SUMMARY_SQL.formatted(sigunguCd == null ? NO_FILTER : SIGUNGU_FILTER);
    JdbcClient.StatementSpec spec = jdbc.sql(sql);
    if (sigunguCd != null) {
      spec = spec.param("sigunguCd", sigunguCd);
    }
    return spec.query(
            (rs, rowNum) ->
                new Counts(
                    rs.getLong("target_count"),
                    rs.getLong("done_count"),
                    rs.getLong("danger_count")))
        .single();
  }
}
