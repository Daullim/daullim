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

  /**
   * 시군구 대표 도농 클래스 — 완충대가 대표가 되면 해석이 불가능해 BUFFER·NO_POP을 빼고 다수결한다. 파이프라인 v0 성적표의 대조 규약과 같은 제외 규칙이다.
   */
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

  /**
   * 동별 대상 가구 수·평균 위험도.
   *
   * <p>대상 가구는 <b>세대 기준</b>이다({@code count(units)}) — 화면 라벨이 "가구 수"이고 점검의 실제 단위가 세대라, H-3 {@code
   * targetCount}와 같은 축으로 센다.
   *
   * <p>평균 위험도는 <b>건물 기준</b>이다. 위험 점수가 건물 속성이라 세대에 조인해 평균 내면 세대 많은 건물이 그만큼 가중된다 — 그래서 두 집계를 따로 돌린 뒤
   * 붙인다.
   *
   * <p>등급 임계값은 절대값이며 pipeline {@code daullim_data/scoring.py::risk_level}과 같다 — danger ≥70 · warn
   * ≥35 · ok &lt;35. 표시값과 등급이 어긋나지 않도록 반올림한 평균 하나에서 둘 다 뽑는다.
   */
  private static final String DONG_AGGREGATE_SQL =
      """
      SELECT b.admin_dong_cd,
             coalesce(u.household_count, 0) AS household_count,
             round(b.avg_score, 1) AS avg_risk_score,
             CASE WHEN round(b.avg_score, 1) >= 70 THEN 'danger'
                  WHEN round(b.avg_score, 1) >= 35 THEN 'warn'
                  ELSE 'ok' END AS avg_risk_level_cd
      FROM (
        SELECT admin_dong_cd, avg(score) AS avg_score
        FROM buildings
        WHERE sigungu_cd = :sigunguCd
        GROUP BY admin_dong_cd
      ) b
      LEFT JOIN (
        SELECT bb.admin_dong_cd, count(*) AS household_count
        FROM units un
        JOIN buildings bb ON bb.building_id = un.building_id
        WHERE bb.sigungu_cd = :sigunguCd
        GROUP BY bb.admin_dong_cd
      ) u ON u.admin_dong_cd = b.admin_dong_cd
      """;

  private final JdbcClient jdbc;

  RegionQueryRepository(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  /** 동 단위 집계 결과. 건물이 없는 동은 아예 행이 없다. */
  public record DongAggregate(
      String dongCd, long householdCount, BigDecimal avgRiskScore, String avgRiskLevelCd) {}

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
                    rs.getString("avg_risk_level_cd")))
        .list()
        .stream()
        .collect(
            Collectors.toMap(
                DongAggregate::dongCd, Function.identity(), (a, b) -> a, LinkedHashMap::new));
  }
}
