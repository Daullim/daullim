package com.daullim.backend.domain.grid.repository;

import com.daullim.backend.domain.grid.GridId;
import com.daullim.backend.domain.grid.dto.GridSummaryItem;
import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class GridQueryRepository {

  /**
   * 1km로 유도한 격자 단위 집계.
   *
   * <p>격자가 없는 건물은 격자 목록에 오를 수 없어 제외한다 — 실데이터에는 0건이지만 DDL이 nullable이라 막아 둔다.
   */
  private static final String SUMMARY_SQL =
      """
      SELECT %s AS grid_id_1km,
             count(*) AS target_count,
             count(*) FILTER (WHERE u.done_count = b.unit_count) AS visited_count
      FROM buildings b
      LEFT JOIN LATERAL (
        SELECT count(*) FILTER (WHERE un.status_cd = 'done') AS done_count
        FROM units un WHERE un.building_id = b.building_id
      ) u ON true
      WHERE b.admin_dong_cd = :dongCd AND b.grid_id IS NOT NULL
      GROUP BY grid_id_1km
      ORDER BY grid_id_1km
      """
          .formatted(GridId.to1kmSql("b"));

  private final JdbcClient jdbc;

  GridQueryRepository(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  public List<GridSummaryItem> summaryByDong(String dongCd) {
    return jdbc.sql(SUMMARY_SQL)
        .param("dongCd", dongCd)
        .query(
            (rs, rowNum) ->
                new GridSummaryItem(
                    rs.getString("grid_id_1km"),
                    rs.getLong("target_count"),
                    rs.getLong("visited_count")))
        .list();
  }
}
