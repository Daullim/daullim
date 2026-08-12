package com.daullim.backend.domain.dashboard.repository;

import com.daullim.backend.domain.dashboard.dto.DashboardCompositionResponse;
import com.daullim.backend.domain.dashboard.dto.DashboardCompositionResponse.HouseTypeCount;
import com.daullim.backend.domain.dashboard.dto.DashboardCompositionResponse.RegionTypeRiskCount;
import com.daullim.backend.domain.dashboard.dto.DashboardCompositionResponse.RiskLevelCount;
import com.daullim.backend.domain.dashboard.dto.DashboardCompositionResponse.RrDistribution;
import com.daullim.backend.domain.dashboard.dto.DashboardCompositionResponse.UseAprDecadeCount;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

@Repository
public class DashboardQueryRepository {

  /** {@code %s} = 시군구 필터 */
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

  private static final String COMPOSITION_SQL =
      """
      WITH filtered_buildings AS (
        SELECT *
        FROM buildings b
        WHERE %1$s
      ),
      building_units AS (
        SELECT b.building_id, b.risk_level_cd, b.region_type_cd, b.house_type_cd,
               b.use_apr_day, b.rr_i, b.is_estimated, coalesce(u.unit_count, 0) AS unit_count
        FROM filtered_buildings b
        LEFT JOIN (
          SELECT building_id, count(*) AS unit_count
          FROM units
          GROUP BY building_id
        ) u ON u.building_id = b.building_id
      ),
      risk_order(code, sort_order) AS (
        VALUES ('danger', 1), ('warn', 2), ('ok', 3)
      ),
      region_order(code, sort_order) AS (
        VALUES ('URBAN', 1), ('RURAL', 2), ('BUFFER', 3)
      ),
      risk_counts AS (
        SELECT risk_level_cd, count(*) AS building_count, coalesce(sum(unit_count), 0) AS unit_count
        FROM building_units
        GROUP BY risk_level_cd
      ),
      region_counts AS (
        SELECT region_type_cd,
               count(*) FILTER (WHERE risk_level_cd = 'danger') AS danger,
               count(*) FILTER (WHERE risk_level_cd = 'warn') AS warn,
               count(*) FILTER (WHERE risk_level_cd = 'ok') AS ok
        FROM building_units
        WHERE region_type_cd <> 'NO_POP'
        GROUP BY region_type_cd
      ),
      house_counts AS (
        SELECT house_type_cd, count(*) AS building_count, coalesce(sum(unit_count), 0) AS unit_count
        FROM building_units
        GROUP BY house_type_cd
      ),
      decade_counts AS (
        SELECT CASE
                 WHEN use_apr_day IS NULL THEN NULL
                 ELSE (substring(use_apr_day, 1, 3) || '0')::int
               END AS decade,
               count(*) AS building_count
        FROM building_units
        GROUP BY decade
      ),
      rr_stats AS (
        SELECT round(min(rr_i), 2) AS min,
               round((percentile_cont(0.5) WITHIN GROUP (ORDER BY rr_i))::numeric, 2) AS p50,
               round((percentile_cont(0.99) WITHIN GROUP (ORDER BY rr_i))::numeric, 2) AS p99,
               round(max(rr_i), 2) AS max
        FROM building_units
        WHERE rr_i IS NOT NULL
      )
      SELECT
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'code', r.code,
              'buildingCount', coalesce(c.building_count, 0),
              'unitCount', coalesce(c.unit_count, 0)
            )
            ORDER BY r.sort_order
          )
          FROM risk_order r
          LEFT JOIN risk_counts c ON c.risk_level_cd = r.code
        ) AS by_risk_level,
        (
          SELECT coalesce(
            jsonb_agg(
              jsonb_build_object(
                'code', r.code,
                'danger', coalesce(c.danger, 0),
                'warn', coalesce(c.warn, 0),
                'ok', coalesce(c.ok, 0)
              )
              ORDER BY r.sort_order
            ) FILTER (WHERE c.region_type_cd IS NOT NULL),
            '[]'::jsonb
          )
          FROM region_order r
          LEFT JOIN region_counts c ON c.region_type_cd = r.code
        ) AS by_region_type,
        (
          SELECT coalesce(
            jsonb_agg(
              jsonb_build_object(
                'code', house_type_cd,
                'buildingCount', building_count,
                'unitCount', unit_count
              )
              ORDER BY building_count DESC, house_type_cd
            ),
            '[]'::jsonb
          )
          FROM house_counts
        ) AS by_house_type,
        (
          SELECT coalesce(
            jsonb_agg(
              jsonb_build_object('decade', decade, 'buildingCount', building_count)
              ORDER BY decade NULLS LAST
            ),
            '[]'::jsonb
          )
          FROM decade_counts
        ) AS by_use_apr_decade,
        (
          SELECT jsonb_build_object('min', min, 'p50', p50, 'p99', p99, 'max', max)
          FROM rr_stats
        ) AS rr_distribution,
        (SELECT count(*) FROM building_units WHERE is_estimated) AS estimated_building_count
      """;

  private static final String NO_FILTER = "true";
  private static final String SIDO_FILTER = "b.sido_cd = :sidoCd";
  private static final String SIGUNGU_FILTER = "b.sigungu_cd = :sigunguCd";

  private final JdbcClient jdbc;
  private final ObjectMapper objectMapper;

  DashboardQueryRepository(JdbcClient jdbc, ObjectMapper objectMapper) {
    this.jdbc = jdbc;
    this.objectMapper = objectMapper;
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

  public DashboardCompositionResponse composition(String sidoCd, String sigunguCd) {
    return bind(COMPOSITION_SQL, sidoCd, sigunguCd)
        .query(
            (rs, rowNum) ->
                new DashboardCompositionResponse(
                    read(
                        rs.getString("by_risk_level"),
                        new TypeReference<List<RiskLevelCount>>() {}),
                    read(
                        rs.getString("by_region_type"),
                        new TypeReference<List<RegionTypeRiskCount>>() {}),
                    read(
                        rs.getString("by_house_type"),
                        new TypeReference<List<HouseTypeCount>>() {}),
                    read(
                        rs.getString("by_use_apr_decade"),
                        new TypeReference<List<UseAprDecadeCount>>() {}),
                    read(rs.getString("rr_distribution"), RrDistribution.class),
                    rs.getLong("estimated_building_count")))
        .single();
  }

  private JdbcClient.StatementSpec bind(String sqlTemplate, String sigunguCd) {
    String sql = sqlTemplate.formatted(sigunguCd == null ? NO_FILTER : SIGUNGU_FILTER);
    JdbcClient.StatementSpec spec = jdbc.sql(sql);
    return sigunguCd == null ? spec : spec.param("sigunguCd", sigunguCd);
  }

  private JdbcClient.StatementSpec bind(String sqlTemplate, String sidoCd, String sigunguCd) {
    String filter = sigunguCd != null ? SIGUNGU_FILTER : sidoCd != null ? SIDO_FILTER : NO_FILTER;
    String sql = sqlTemplate.formatted(filter);
    JdbcClient.StatementSpec spec = jdbc.sql(sql);
    if (sigunguCd != null) {
      return spec.param("sigunguCd", sigunguCd);
    }
    return sidoCd == null ? spec : spec.param("sidoCd", sidoCd);
  }

  private <T> T read(String json, TypeReference<T> type) {
    try {
      return objectMapper.readValue(json, type);
    } catch (JacksonException e) {
      throw new IllegalStateException("관제 집계 JSON 역직렬화 실패", e);
    }
  }

  private <T> T read(String json, Class<T> type) {
    try {
      return objectMapper.readValue(json, type);
    } catch (JacksonException e) {
      throw new IllegalStateException("관제 집계 JSON 역직렬화 실패", e);
    }
  }
}
