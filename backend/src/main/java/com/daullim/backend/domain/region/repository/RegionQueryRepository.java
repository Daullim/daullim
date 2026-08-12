package com.daullim.backend.domain.region.repository;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** 지역 화면이 쓰는 {@code buildings} 집계. 명칭은 DB에 없어 사전이 붙인다. */
@Repository
public class RegionQueryRepository {

  // 시군구 대표 도농값 — BUFFER·NO_POP 제외 다수결 (pipeline v0 대조 규약과 동일 제외 규칙)
  private static final String MAJORITY_REGION_TYPE_SQL =
      """
      SELECT DISTINCT ON (sigungu_cd) sigungu_cd, region_type_cd
      FROM (
        SELECT sigungu_cd, region_type_cd, count(*) AS cnt
        FROM buildings
        WHERE sido_cd = :sidoCd AND region_type_cd IN ('URBAN','RURAL')
        GROUP BY sigungu_cd, region_type_cd
      ) t
      ORDER BY sigungu_cd, cnt DESC, region_type_cd
      """;

  // 대상 가구는 세대 기준(count(units)), 평균 위험도는 건물 기준 — 축이 달라 따로 집계 후 결합
  // 등급 임계값 danger>=70·warn>=35·ok<35, pipeline scoring.py::risk_level과 동일
  private static final String DONG_AGGREGATE_SQL =
      """
      SELECT b.admin_dong_cd,
             coalesce(u.household_count, 0) AS household_count,
             round(b.avg_score, 1) AS avg_risk_score,
             CASE WHEN round(b.avg_score, 1) >= 70 THEN 'danger'
                  WHEN round(b.avg_score, 1) >= 35 THEN 'warn'
                  ELSE 'ok' END AS avg_risk_level_cd,
             b.building_count,
             b.danger_count,
             round(b.avg_rr, 1) AS avg_rr_i,
             coalesce(u.done_unit_count, 0) AS done_unit_count,
             coalesce(u.pending_unit_count, 0) AS pending_unit_count,
             coalesce(v.replacement_used_count, 0) AS replacement_used_count,
             coalesce(r.revisit_pending_unit_count, 0) AS revisit_pending_unit_count
      FROM (
        SELECT admin_dong_cd,
               avg(score) AS avg_score,
               count(*) AS building_count,
               count(*) FILTER (WHERE risk_level_cd = 'danger') AS danger_count,
               avg(rr_i) AS avg_rr
        FROM buildings
        WHERE sigungu_cd = :sigunguCd
        GROUP BY admin_dong_cd
      ) b
      LEFT JOIN (
        SELECT bb.admin_dong_cd,
               count(*) AS household_count,
               count(*) FILTER (
                 WHERE un.status_cd = 'done' OR un.last_inspected_day IS NOT NULL OR vu.unit_id IS NOT NULL
               ) AS done_unit_count,
               count(*) FILTER (
                 WHERE un.status_cd <> 'done' AND un.last_inspected_day IS NULL AND vu.unit_id IS NULL
               ) AS pending_unit_count
        FROM units un
        JOIN buildings bb ON bb.building_id = un.building_id
        LEFT JOIN (
          SELECT DISTINCT unit_id
          FROM visits
          WHERE deleted_at IS NULL
        ) vu ON vu.unit_id = un.unit_id
        WHERE bb.sigungu_cd = :sigunguCd
        GROUP BY bb.admin_dong_cd
      ) u ON u.admin_dong_cd = b.admin_dong_cd
      LEFT JOIN (
        SELECT bb.admin_dong_cd,
               coalesce(sum(coalesce(v.effective_replace_count, 0)), 0) AS replacement_used_count
        FROM visits v
        JOIN units un ON un.unit_id = v.unit_id
        JOIN buildings bb ON bb.building_id = un.building_id
        WHERE bb.sigungu_cd = :sigunguCd
          AND v.deleted_at IS NULL
        GROUP BY bb.admin_dong_cd
      ) v ON v.admin_dong_cd = b.admin_dong_cd
      LEFT JOIN (
        SELECT bb.admin_dong_cd,
               count(*) AS revisit_pending_unit_count
        FROM units un
        JOIN buildings bb ON bb.building_id = un.building_id
        JOIN LATERAL (
          SELECT v.revisit_plan_cd
          FROM visits v
          WHERE v.unit_id = un.unit_id AND v.deleted_at IS NULL
          ORDER BY v.visited_at DESC, v.visit_id DESC
          LIMIT 1
        ) last ON true
        WHERE bb.sigungu_cd = :sigunguCd
          AND last.revisit_plan_cd = 'revisit'
        GROUP BY bb.admin_dong_cd
      ) r ON r.admin_dong_cd = b.admin_dong_cd
      """;

  private final JdbcClient jdbc;

  RegionQueryRepository(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  /**
   * 동 단위 집계 결과. 건물이 없는 동은 아예 행이 없음.
   *
   * @param avgRrI 상대위험도 평균 — 점수와 별개 축(정규화값 아닌 배수), 건물 없으면 null
   */
  public record DongAggregate(
      String dongCd,
      long householdCount,
      BigDecimal avgRiskScore,
      String avgRiskLevelCd,
      long buildingCount,
      long dangerCount,
      BigDecimal avgRrI,
      long doneUnitCount,
      long pendingUnitCount,
      long replacementUsedCount,
      long revisitPendingUnitCount) {}

  public Map<String, String> majorityRegionTypeBySigungu(String sidoCd) {
    return jdbc.sql(MAJORITY_REGION_TYPE_SQL).param("sidoCd", sidoCd).query().listOfRows().stream()
        .collect(
            Collectors.toMap(
                row -> (String) row.get("sigungu_cd"),
                row -> (String) row.get("region_type_cd"),
                (a, b) -> a,
                LinkedHashMap::new));
  }

  public Map<String, DongAggregate> aggregateByDong(String sigunguCd) {
    return jdbc
        .sql(DONG_AGGREGATE_SQL)
        .param("sigunguCd", sigunguCd)
        .query(
            (rs, rowNum) ->
                new DongAggregate(
                    rs.getString("admin_dong_cd"),
                    rs.getLong("household_count"),
                    rs.getBigDecimal("avg_risk_score"),
                    rs.getString("avg_risk_level_cd"),
                    rs.getLong("building_count"),
                    rs.getLong("danger_count"),
                    rs.getBigDecimal("avg_rr_i"),
                    rs.getLong("done_unit_count"),
                    rs.getLong("pending_unit_count"),
                    rs.getLong("replacement_used_count"),
                    rs.getLong("revisit_pending_unit_count")))
        .list()
        .stream()
        .collect(
            Collectors.toMap(
                DongAggregate::dongCd, Function.identity(), (a, b) -> a, LinkedHashMap::new));
  }
}
