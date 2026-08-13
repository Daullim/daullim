package com.daullim.backend.domain.region;

import static org.assertj.core.api.Assertions.assertThat;

import com.daullim.backend.domain.region.RegionCatalog.Region;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** 사전이 DB가 아니라 리소스 파일이라, 파일이 깨지면 셀렉터가 통째로 빈다. 로딩 자체를 잠근다. */
class RegionCatalogTest {

  private final RegionCatalog catalog = new RegionCatalog();

  @Test
  @DisplayName("시연 범위 3시도 · 6시군구 · 85행정동을 읽는다 (ADR-010 개정 2)")
  void loadsDemoUniverse() {
    assertThat(catalog.sidos()).extracting(Region::code).containsExactly("11", "26", "52");
    // 개정 2로 세 시도가 모두 시군구 둘씩 — 시도마다 도시·농촌 대비가 성립한다.
    assertThat(catalog.sigungus("11")).extracting(Region::code).containsExactly("11305", "11620");
    assertThat(catalog.sigungus("26")).extracting(Region::code).containsExactly("26230", "26710");
    assertThat(catalog.sigungus("52")).extracting(Region::code).containsExactly("52750", "52790");
    assertThat(catalog.dongs("11305")).hasSize(13);
    assertThat(catalog.dongs("11620")).hasSize(21);
    assertThat(catalog.dongs("26230")).hasSize(20);
    assertThat(catalog.dongs("26710")).hasSize(5);
    assertThat(catalog.dongs("52750")).hasSize(12);
    assertThat(catalog.dongs("52790")).hasSize(14);
  }

  @Test
  @DisplayName("코드로 명칭을 찾는다")
  void resolvesNames() {
    assertThat(catalog.sidos()).extracting(Region::name).contains("서울특별시", "부산광역시", "전북특별자치도");
    assertThat(catalog.sigungus("11")).extracting(Region::name).contains("관악구", "강북구");
    assertThat(catalog.sigungus("26")).extracting(Region::name).contains("부산진구", "기장군");
    assertThat(catalog.dongs("11620"))
        .filteredOn(r -> r.code().equals("1162069500"))
        .extracting(Region::name)
        .containsExactly("신림동");
  }

  @Test
  @DisplayName("행정동코드는 10자리이고 앞자리가 상위 코드와 일치한다")
  void codeHierarchyIsPrefixBased() {
    for (String sigunguCd : List.of("11305", "11620", "26230", "26710", "52750", "52790")) {
      assertThat(catalog.dongs(sigunguCd))
          .allSatisfy(
              dong -> {
                assertThat(dong.code()).hasSize(10);
                assertThat(dong.code()).startsWith(sigunguCd);
                assertThat(dong.parentCode()).isEqualTo(sigunguCd);
              });
    }
  }

  @Test
  @DisplayName("모르는 코드는 빈 목록이다")
  void unknownCodeYieldsEmptyList() {
    assertThat(catalog.sigungus("45")).isEmpty();
    assertThat(catalog.dongs("99999")).isEmpty();
  }
}
