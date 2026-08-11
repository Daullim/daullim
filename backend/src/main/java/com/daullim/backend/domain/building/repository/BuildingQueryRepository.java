package com.daullim.backend.domain.building.repository;

import com.daullim.backend.domain.building.dto.BuildingDetailResponse;
import com.daullim.backend.domain.building.dto.BuildingQueueItem;
import com.daullim.backend.domain.grid.GridId;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** 큐·상세 조회 투영 — 엔티티가 아니라 DTO 직접 매핑 */
@Repository
public class BuildingQueryRepository {

  // 큐는 저장물이 아닌 조회 시 파생값(ADR-012 결정 18)
  // 세대 집계를 건별로 세면 N+1 발생 — LATERAL로 일괄 조회
  private static final String QUEUE_SELECT =
      """
      SELECT b.building_id, b.order_key, b.address, b.house_type_cd, b.score, b.risk_level_cd,
             b.is_estimated, b.basis, b.rx_code_cd, b.lat, b.lng, b.install_day,
             b.unit_count, u.done_count, u.last_inspected_day
      FROM buildings b
      LEFT JOIN LATERAL (
        SELECT count(*) FILTER (WHERE un.status_cd = 'done') AS done_count,
               max(un.last_inspected_day) AS last_inspected_day
        FROM units un WHERE un.building_id = b.building_id
      ) u ON true
      WHERE b.admin_dong_cd = :dongCd
      """;

  private static final String DETAIL_SQL =
      """
      SELECT b.building_id, b.address, b.house_type_cd, b.floor_count, b.unit_count,
             b.use_apr_day, b.install_day, b.install_year, b.detector_model,
             b.lat, b.lng, b.score, b.risk_level_cd, b.rx_code_cd,
             b.is_estimated, b.is_explore, b.basis, b.score_version, b.computed_at
      FROM buildings b
      WHERE b.building_id = :buildingId
      """;

  private final JdbcClient jdbc;

  BuildingQueryRepository(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  /** 큐 조회 조건. {@code gridId}는 1km, {@code addressNorm}은 공백이 제거된 검색어다. */
  public record QueueCriteria(
      String dongCd, String gridId, String addressNorm, Integer afterOrderKey, int limit) {}

  public List<BuildingQueueItem> findQueue(QueueCriteria criteria) {
    StringBuilder sql = new StringBuilder(QUEUE_SELECT);
    if (criteria.gridId() != null) {
      sql.append("  AND ").append(GridId.to1kmSql("b")).append(" = :gridId\n");
    }
    if (criteria.addressNorm() != null) {
      sql.append("  AND b.address_norm LIKE :addressNorm ESCAPE '\\'\n");
    }
    if (criteria.afterOrderKey() != null) {
      sql.append("  AND b.order_key > :afterOrderKey\n");
    }
    sql.append("ORDER BY b.order_key\nLIMIT :limit");

    JdbcClient.StatementSpec spec =
        jdbc.sql(sql.toString())
            .param("dongCd", criteria.dongCd())
            .param("limit", criteria.limit());
    if (criteria.gridId() != null) {
      spec = spec.param("gridId", criteria.gridId());
    }
    if (criteria.addressNorm() != null) {
      spec = spec.param("addressNorm", "%" + criteria.addressNorm() + "%");
    }
    if (criteria.afterOrderKey() != null) {
      spec = spec.param("afterOrderKey", criteria.afterOrderKey());
    }

    return spec.query(
            (rs, rowNum) ->
                new BuildingQueueItem(
                    rs.getLong("building_id"),
                    rs.getInt("order_key"),
                    rs.getString("address"),
                    rs.getString("house_type_cd"),
                    rs.getBigDecimal("score"),
                    rs.getString("risk_level_cd"),
                    rs.getBoolean("is_estimated"),
                    rs.getString("basis"),
                    rs.getString("rx_code_cd"),
                    rs.getBigDecimal("lat"),
                    rs.getBigDecimal("lng"),
                    rs.getString("install_day"),
                    rs.getString("last_inspected_day"),
                    rs.getInt("unit_count"),
                    rs.getLong("done_count")))
        .list();
  }

  public Optional<BuildingDetailResponse> findDetail(long buildingId) {
    return jdbc.sql(DETAIL_SQL)
        .param("buildingId", buildingId)
        .query(
            (rs, rowNum) -> {
              // smallint nullable — getInt는 null을 0으로 뭉갠다.
              Number installYear = (Number) rs.getObject("install_year");
              return new BuildingDetailResponse(
                  rs.getLong("building_id"),
                  rs.getString("address"),
                  rs.getString("house_type_cd"),
                  rs.getInt("floor_count"),
                  rs.getInt("unit_count"),
                  rs.getString("use_apr_day"),
                  rs.getString("install_day"),
                  installYear == null ? null : installYear.intValue(),
                  rs.getString("detector_model"),
                  rs.getBigDecimal("lat"),
                  rs.getBigDecimal("lng"),
                  rs.getBigDecimal("score"),
                  rs.getString("risk_level_cd"),
                  rs.getString("rx_code_cd"),
                  rs.getBoolean("is_estimated"),
                  rs.getBoolean("is_explore"),
                  rs.getString("basis"),
                  rs.getString("score_version"),
                  rs.getTimestamp("computed_at").toInstant());
            })
        .optional();
  }

  public boolean existsById(long buildingId) {
    return Boolean.TRUE.equals(
        jdbc.sql("SELECT exists(SELECT 1 FROM buildings WHERE building_id = :buildingId)")
            .param("buildingId", buildingId)
            .query(Boolean.class)
            .single());
  }
}
