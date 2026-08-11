package com.daullim.backend.domain.grid;

/** 격자 코드 체계 변환 — DB 500m 격자를 화면용 1km 격자로 유도 */
public final class GridId {

  // pipeline utils.py::grid500_to_1km과 동일 규칙, GridIdIT가 to1km()과 일치 검증
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

  /** 테이블 별칭을 끼운 SQL 표현식 */
  public static String to1kmSql(String tableAlias) {
    return TO_1KM_SQL.formatted(tableAlias);
  }
}
