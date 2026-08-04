package com.daullim.backend.domain.grid;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** 500m → 1km 유도는 화면이 격자를 하나도 못 찾는 사고와 직결돼 규칙을 못 박아 둔다. */
class GridIdTest {

  @ParameterizedTest
  @CsvSource({
    "다사46a41a, 다사4641",
    "다사46b41b, 다사4641",
    "다마71a46b, 다마7146",
    "라마08b03a, 라마0803",
  })
  @DisplayName("500m 코드에서 하위 구분자 두 자리를 떼면 1km 코드가 된다")
  void derives1kmCode(String grid500, String expected) {
    assertThat(GridId.to1km(grid500)).isEqualTo(expected);
  }

  @Test
  @DisplayName("같은 1km 안의 네 셀이 한 코드로 모인다")
  void fourCellsCollapseIntoOne() {
    assertThat(GridId.to1km("다사46a41a"))
        .isEqualTo(GridId.to1km("다사46a41b"))
        .isEqualTo(GridId.to1km("다사46b41a"))
        .isEqualTo(GridId.to1km("다사46b41b"));
  }

  @Test
  @DisplayName("500m 코드가 아니면 거절한다")
  void rejectsNon500mCode() {
    assertThatThrownBy(() -> GridId.to1km("다사4641")).isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> GridId.to1km(null)).isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  @DisplayName("SQL 표현식에 테이블 별칭이 끼워진다")
  void buildsSqlExpression() {
    assertThat(GridId.to1kmSql("b")).isEqualTo("substr(b.grid_id,1,4) || substr(b.grid_id,6,2)");
  }
}
