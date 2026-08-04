package com.daullim.backend.domain.grid;

/**
 * 격자 코드 체계 변환 — DB는 500m, 화면이 쓰는 GeoJSON 경계는 1km다.
 *
 * <p>{@code buildings.grid_id}는 {@code 다사46a41a}(500m)이고 {@code seed/grids.geojson}은 {@code
 * 다사4641}(1km)이라 그대로 조인하면 0건이 된다. 응답에 내리는 {@code gridId}는 서버가 1km로 유도한다.
 *
 * <p>pipeline {@code daullim_data/utils.py::grid500_to_1km}과 같은 규칙이며 서울 2023 화재 5,646/5,646 = 100%로
 * 검증된 유도다. DB의 500m 값은 그대로 둔다 — 국토부 500m 경계를 확보하면 그 값을 바로 쓴다.
 */
public final class GridId {

  /**
   * {@link #to1km(String)}과 같은 규칙의 SQL 표현식. 집계·필터를 SQL에서 해야 해서 두 벌이 존재하므로 {@code GridIdIT}가 둘의 일치를
   * 잠근다. {@code %s}에 테이블 별칭이 들어간다.
   */
  public static final String TO_1KM_SQL = "substr(%1$s.grid_id,1,4) || substr(%1$s.grid_id,6,2)";

  private static final int LENGTH_500M = 8;

  private GridId() {}

  /** 다사46a41a → 다사4641 */
  public static String to1km(String grid500) {
    if (grid500 == null || grid500.length() != LENGTH_500M) {
      throw new IllegalArgumentException("500m 격자 코드가 아니다: " + grid500);
    }
    return grid500.substring(0, 2) + grid500.substring(2, 4) + grid500.substring(5, 7);
  }

  /** 테이블 별칭을 끼운 SQL 표현식. */
  public static String to1kmSql(String tableAlias) {
    return TO_1KM_SQL.formatted(tableAlias);
  }
}
