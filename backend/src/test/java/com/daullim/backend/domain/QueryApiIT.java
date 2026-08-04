package com.daullim.backend.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.daullim.backend.TestcontainersConfiguration;
import com.daullim.backend.domain.building.service.QueueCursor;
import com.daullim.backend.domain.grid.GridId;
import jakarta.persistence.EntityManager;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

/**
 * 조회 API 9종의 계약을 실제 HTTP 경로로 잠근다.
 *
 * <p>{@code buildings}는 pipeline 소유라 리포지토리로 넣을 수 없어 픽스처를 SQL로 만든다. 시연 유니버스와 같은 코드를 쓴다 — 신림동
 * 1162069500 · 난곡동 1162077500 · 관악구 11620 · 서울 11.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class QueryApiIT {

  private static final String SIDO = "11";
  private static final String SIGUNGU = "11620";
  private static final String DONG = "1162069500";
  private static final String OTHER_DONG = "1162077500";

  @Autowired MockMvc mvc;
  @Autowired JdbcClient jdbc;
  @Autowired EntityManager em;

  /** 큐 순서대로 B1·B2·B3(신림동) + B4(난곡동). */
  private long b1;

  private long b2;
  private long b3;
  private long b4;

  private long b2FieldUnit;
  private long b1ExposUnit;

  @BeforeEach
  void setUp() {
    // 다사46a41a·다사46b41a는 같은 1km(다사4641)로 모인다 — 유도가 없으면 이 둘이 갈라진다.
    b1 =
        insertBuilding(
            DONG,
            1,
            "다사46a41a",
            "서울특별시 관악구 신림로 1",
            2,
            "91.20",
            "danger",
            "URBAN",
            "multi-unit",
            "RX-BAT",
            "20011019");
    b2 =
        insertBuilding(
            DONG,
            2,
            "다사46b41a",
            "서울특별시 관악구 신림로 22",
            2,
            "55.00",
            "warn",
            "URBAN",
            "multi-family",
            "RX-IOT",
            null);
    b3 =
        insertBuilding(
            DONG,
            3,
            "다사47a41a",
            "서울특별시 관악구 봉천로 33",
            1,
            "20.00",
            "ok",
            "RURAL",
            "detached",
            null,
            "19930715");
    b4 =
        insertBuilding(
            OTHER_DONG,
            4,
            "다사48a41a",
            "서울특별시 관악구 난곡로 44",
            1,
            "75.00",
            "danger",
            "BUFFER",
            "detached",
            null,
            null);

    b1ExposUnit = insertUnit(b1, 1, "101호", (short) 1, "expos", "done", "20260701");
    insertUnit(b1, 2, "102호", (short) 1, "expos", "done", "20260702");
    b2FieldUnit = insertUnit(b2, 1, null, null, "field", "pending", null);
    insertUnit(b2, 2, "201호", null, "field", "pending", null);
    insertUnit(b3, 1, "본가구", null, "implicit", "pending", null);
    insertUnit(b4, 1, "본가구", null, "implicit", "pending", null);
  }

  @Nested
  @DisplayName("C. 지역")
  class Regions {

    @Test
    @DisplayName("시도는 행정표준코드로 내려간다 — 슬러그가 아니다")
    void sidos() throws Exception {
      mvc.perform(get("/api/v1/regions/sidos").with(jwt()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.code").value("SUCCESS"))
          .andExpect(jsonPath("$.data[0].sidoCd").value("11"))
          .andExpect(jsonPath("$.data[0].sidoNm").value("서울특별시"))
          .andExpect(jsonPath("$.data[1].sidoCd").value("52"));
    }

    @Test
    @DisplayName("시군구 regionTypeCd는 BUFFER를 뺀 URBAN·RURAL 다수값이다")
    void sigungus() throws Exception {
      mvc.perform(get("/api/v1/regions/sigungus").param("sidoCd", SIDO).with(jwt()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.data[0].sigunguCd").value(SIGUNGU))
          .andExpect(jsonPath("$.data[0].sigunguNm").value("관악구"))
          // URBAN 2(B1·B2) vs RURAL 1(B3), BUFFER인 B4는 세지 않는다.
          .andExpect(jsonPath("$.data[0].regionTypeCd").value("URBAN"));
    }

    @Test
    @DisplayName("행정동은 사전 21개 전부 내려가고 가구 수는 세대·평균 위험도는 건물 기준이다")
    void dongs() throws Exception {
      mvc.perform(get("/api/v1/regions/dongs").param("sigunguCd", SIGUNGU).with(jwt()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.data.length()").value(21))
          .andExpect(jsonPath("$.data[?(@.dongCd=='" + DONG + "')].dongNm").value("신림동"))
          // 건물 3채가 아니라 세대 5호(2+2+1)
          .andExpect(jsonPath("$.data[?(@.dongCd=='" + DONG + "')].householdCount").value(5))
          // 건물 평균 (91.20 + 55.00 + 20.00) / 3 = 55.4.
          // 세대로 가중하면 62.5가 되므로 이 값이 축이 섞이지 않았다는 증거다.
          .andExpect(jsonPath("$.data[?(@.dongCd=='" + DONG + "')].avgRiskScore").value(55.4))
          .andExpect(jsonPath("$.data[?(@.dongCd=='" + DONG + "')].avgRiskLevelCd").value("warn"))
          .andExpect(
              jsonPath("$.data[?(@.dongCd=='" + OTHER_DONG + "')].avgRiskLevelCd").value("danger"))
          // 건물이 없는 동도 셀렉터에는 떠야 한다
          .andExpect(jsonPath("$.data[?(@.dongCd=='1162052500')].householdCount").value(0));
    }

    @Test
    @DisplayName("코드 형식이 어긋나면 400이다")
    void rejectsMalformedCode() throws Exception {
      mvc.perform(get("/api/v1/regions/dongs").param("sigunguCd", "gwanak").with(jwt()))
          .andExpect(status().isBadRequest())
          .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }
  }

  @Nested
  @DisplayName("E-1. 우선순위 큐")
  class Queue {

    @Test
    @DisplayName("order_key 순으로 내려가고 세대 집계가 한 번에 붙는다")
    void ordersByOrderKeyWithUnitAggregates() throws Exception {
      mvc.perform(get("/api/v1/buildings/queue").param("dongCd", DONG).with(jwt()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.data.items.length()").value(3))
          .andExpect(jsonPath("$.data.items[0].buildingId").value(b1))
          .andExpect(jsonPath("$.data.items[0].orderKey").value(1))
          .andExpect(jsonPath("$.data.items[0].unitCount").value(2))
          .andExpect(jsonPath("$.data.items[0].unitDoneCount").value(2))
          // max(units.last_inspected_day)
          .andExpect(jsonPath("$.data.items[0].lastInspectedDay").value("20260702"))
          .andExpect(jsonPath("$.data.items[1].unitDoneCount").value(0))
          .andExpect(jsonPath("$.data.items[1].lastInspectedDay").doesNotExist())
          .andExpect(jsonPath("$.data.items[2].orderKey").value(3))
          .andExpect(jsonPath("$.data.nextCursor").doesNotExist());
    }

    @Test
    @DisplayName("보급이력이 없어 basis는 '미보급'이고 installDay는 null이다")
    void reflectsRealDataShape() throws Exception {
      mvc.perform(get("/api/v1/buildings/queue").param("dongCd", DONG).with(jwt()))
          .andExpect(jsonPath("$.data.items[0].basis").value("미보급 · 동선 1"))
          .andExpect(jsonPath("$.data.items[0].installDay").doesNotExist())
          .andExpect(jsonPath("$.data.items[0].rxCodeCd").value("RX-BAT"));
    }

    @Test
    @DisplayName("커서로 이어 읽으면 겹치지도 빠지지도 않는다")
    void paginatesByCursor() throws Exception {
      MvcResult first =
          mvc.perform(
                  get("/api/v1/buildings/queue")
                      .param("dongCd", DONG)
                      .param("size", "2")
                      .with(jwt()))
              .andExpect(status().isOk())
              .andExpect(jsonPath("$.data.items.length()").value(2))
              .andExpect(jsonPath("$.data.nextCursor").value(QueueCursor.encode(2)))
              .andReturn();

      assertThat(first.getResponse().getContentAsString()).contains("\"orderKey\":1");

      mvc.perform(
              get("/api/v1/buildings/queue")
                  .param("dongCd", DONG)
                  .param("size", "2")
                  .param("cursor", QueueCursor.encode(2))
                  .with(jwt()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.data.items.length()").value(1))
          .andExpect(jsonPath("$.data.items[0].orderKey").value(3))
          .andExpect(jsonPath("$.data.nextCursor").doesNotExist());
    }

    @Test
    @DisplayName("size는 1..100을 벗어나면 400이다")
    void rejectsOversizedPage() throws Exception {
      mvc.perform(
              get("/api/v1/buildings/queue").param("dongCd", DONG).param("size", "101").with(jwt()))
          .andExpect(status().isBadRequest())
          .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    @DisplayName("gridId는 1km으로 받아 500m 저장값과 매칭한다")
    void filtersByDerived1kmGrid() throws Exception {
      mvc.perform(
              get("/api/v1/buildings/queue")
                  .param("dongCd", DONG)
                  .param("gridId", "다사4641")
                  .with(jwt()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.data.items.length()").value(2))
          .andExpect(jsonPath("$.data.items[0].buildingId").value(b1))
          .andExpect(jsonPath("$.data.items[1].buildingId").value(b2));

      // 500m 코드를 그대로 주면 아무것도 안 잡힌다 — FE가 1km을 넘겨야 한다는 증거
      mvc.perform(
              get("/api/v1/buildings/queue")
                  .param("dongCd", DONG)
                  .param("gridId", "다사46a41a")
                  .with(jwt()))
          .andExpect(jsonPath("$.data.items.length()").value(0));
    }

    @Test
    @DisplayName("주소 검색은 서버가 공백을 지운 뒤 매칭한다")
    void searchesAddressIgnoringWhitespace() throws Exception {
      mvc.perform(
              get("/api/v1/buildings/queue").param("dongCd", DONG).param("q", "신림로 1").with(jwt()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.data.items.length()").value(1))
          .andExpect(jsonPath("$.data.items[0].buildingId").value(b1));

      // LIKE 메타문자는 이스케이프된다 — '%'가 전체 매칭이 되면 안 된다
      mvc.perform(get("/api/v1/buildings/queue").param("dongCd", DONG).param("q", "%").with(jwt()))
          .andExpect(jsonPath("$.data.items.length()").value(0));
    }

    @Test
    @DisplayName("깨진 커서는 400이다")
    void rejectsBrokenCursor() throws Exception {
      mvc.perform(
              get("/api/v1/buildings/queue")
                  .param("dongCd", DONG)
                  .param("cursor", "not-a-cursor")
                  .with(jwt()))
          .andExpect(status().isBadRequest())
          .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }
  }

  @Nested
  @DisplayName("E-2·F-1. 건물 상세와 세대 목록")
  class BuildingDetailAndUnits {

    @Test
    @DisplayName("상세는 대장 프리필과 점수 근거를 함께 내린다")
    void detail() throws Exception {
      mvc.perform(get("/api/v1/buildings/{id}", b1).with(jwt()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.data.buildingId").value(b1))
          .andExpect(jsonPath("$.data.houseTypeCd").value("multi-unit"))
          .andExpect(jsonPath("$.data.floorCount").value(3))
          .andExpect(jsonPath("$.data.useAprDay").value("20011019"))
          .andExpect(jsonPath("$.data.scoreVersion").value("v0-20260805"))
          .andExpect(jsonPath("$.data.computedAt").exists())
          // 통합 대장이 없어 확정적으로 비는 세 필드
          .andExpect(jsonPath("$.data.installDay").doesNotExist())
          .andExpect(jsonPath("$.data.installYear").doesNotExist())
          .andExpect(jsonPath("$.data.detectorModel").doesNotExist());
    }

    @Test
    @DisplayName("사용승인일이 없는 건물은 null로 내려 FE '미등재' 분기를 살린다")
    void detailKeepsMissingUseAprDayNull() throws Exception {
      mvc.perform(get("/api/v1/buildings/{id}", b2).with(jwt()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.data.useAprDay").doesNotExist())
          .andExpect(jsonPath("$.data.isEstimated").value(true));
    }

    @Test
    @DisplayName("없는 건물은 404 봉투다")
    void detailNotFound() throws Exception {
      mvc.perform(get("/api/v1/buildings/{id}", 999_999L).with(jwt()))
          .andExpect(status().isNotFound())
          .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    @DisplayName("세대 목록은 unitSeq 순이고 미지정 호수는 null이다")
    void units() throws Exception {
      mvc.perform(get("/api/v1/buildings/{id}/units", b2).with(jwt()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.data.length()").value(2))
          .andExpect(jsonPath("$.data[0].unitSeq").value(1))
          .andExpect(jsonPath("$.data[0].hoNm").doesNotExist())
          .andExpect(jsonPath("$.data[0].hoNmSourceCd").value("field"))
          .andExpect(jsonPath("$.data[0].statusCd").value("pending"))
          .andExpect(jsonPath("$.data[1].hoNm").value("201호"));
    }

    @Test
    @DisplayName("없는 건물의 세대 목록은 404다 — 빈 배열이 아니다")
    void unitsNotFound() throws Exception {
      mvc.perform(get("/api/v1/buildings/{id}/units", 999_999L).with(jwt()))
          .andExpect(status().isNotFound());
    }
  }

  @Nested
  @DisplayName("F-2. 세대 호수 수정")
  class RenameUnit {

    @Test
    @DisplayName("field 행은 수정되고 업무 상태는 건드리지 않는다")
    void renamesFieldUnit() throws Exception {
      mvc.perform(
              patch("/api/v1/units/{id}", b2FieldUnit)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"hoNm\":\"101호\"}")
                  .with(jwt()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.data.hoNm").value("101호"))
          .andExpect(jsonPath("$.data.hoNmSourceCd").value("field"))
          .andExpect(jsonPath("$.data.statusCd").value("pending"))
          .andExpect(jsonPath("$.data.lastInspectedDay").doesNotExist());

      // 테스트가 트랜잭션을 붙들고 있어 커밋이 없다 — 더티 체킹 결과를 JDBC로 보려면 밀어내야 한다.
      em.flush();

      Map<String, Object> row =
          jdbc.sql(
                  """
                  SELECT ho_nm, status_cd, last_inspected_day, rx_baseline_day
                  FROM units WHERE unit_id = :id
                  """)
              .param("id", b2FieldUnit)
              .query()
              .singleRow();
      assertThat(row.get("ho_nm")).isEqualTo("101호");
      assertThat(row.get("status_cd")).isEqualTo("pending");
      assertThat(row.get("last_inspected_day")).isNull();
      assertThat(row.get("rx_baseline_day")).isNull();
    }

    @Test
    @DisplayName("대장에서 온 호수(expos)는 403이다")
    void rejectsLedgerSourcedUnit() throws Exception {
      mvc.perform(
              patch("/api/v1/units/{id}", b1ExposUnit)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"hoNm\":\"999호\"}")
                  .with(jwt()))
          .andExpect(status().isForbidden())
          .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    @DisplayName("같은 건물에 있는 호수는 409다")
    void rejectsDuplicateHoNm() throws Exception {
      mvc.perform(
              patch("/api/v1/units/{id}", b2FieldUnit)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"hoNm\":\"201호\"}")
                  .with(jwt()))
          .andExpect(status().isConflict())
          .andExpect(jsonPath("$.code").value("CONFLICT"));
    }

    @Test
    @DisplayName("빈 호수는 400이다")
    void rejectsBlankHoNm() throws Exception {
      mvc.perform(
              patch("/api/v1/units/{id}", b2FieldUnit)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"hoNm\":\"  \"}")
                  .with(jwt()))
          .andExpect(status().isBadRequest())
          .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    @DisplayName("없는 세대는 404다")
    void notFound() throws Exception {
      mvc.perform(
              patch("/api/v1/units/{id}", 999_999L)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"hoNm\":\"101호\"}")
                  .with(jwt()))
          .andExpect(status().isNotFound());
    }
  }

  @Nested
  @DisplayName("D-3·H-3. 요약")
  class Summaries {

    @Test
    @DisplayName("격자 요약은 1km으로 모아 세고 전 세대 완료만 방문으로 친다")
    void gridSummary() throws Exception {
      mvc.perform(get("/api/v1/grids/summary").param("dongCd", DONG).with(jwt()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.data.length()").value(2))
          .andExpect(jsonPath("$.data[0].gridId").value("다사4641"))
          .andExpect(jsonPath("$.data[0].targetCount").value(2))
          // B1만 2/2 완료, B2는 0/2
          .andExpect(jsonPath("$.data[0].visitedCount").value(1))
          .andExpect(jsonPath("$.data[1].gridId").value("다사4741"))
          .andExpect(jsonPath("$.data[1].targetCount").value(1))
          .andExpect(jsonPath("$.data[1].visitedCount").value(0));
    }

    @Test
    @DisplayName("SQL 유도 격자와 자바 유도 격자가 같은 값을 낸다")
    void sqlAndJavaDerivationAgree() {
      jdbc.sql("SELECT grid_id, %s AS derived FROM buildings b".formatted(GridId.to1kmSql("b")))
          .query()
          .listOfRows()
          .forEach(
              row ->
                  assertThat(row.get("derived"))
                      .isEqualTo(GridId.to1km((String) row.get("grid_id"))));
    }

    @Test
    @DisplayName("관제 요약은 세대 기준 대상·완료와 건물 기준 위험을 센다")
    void dashboardSummary() throws Exception {
      mvc.perform(get("/api/v1/dashboard/summary").param("sigunguCd", SIGUNGU).with(jwt()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.data.targetCount").value(6))
          .andExpect(jsonPath("$.data.doneCount").value(2))
          // B1·B4
          .andExpect(jsonPath("$.data.dangerCount").value(2))
          .andExpect(jsonPath("$.data.updatedAt").exists());
    }

    @Test
    @DisplayName("시군구를 생략하면 전 지역을 센다")
    void dashboardSummaryWithoutRegion() throws Exception {
      mvc.perform(get("/api/v1/dashboard/summary").with(jwt()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.data.targetCount").value(6));
    }
  }

  @Test
  @DisplayName("토큰이 없으면 조회 API도 401이다")
  void requiresAuthentication() throws Exception {
    mvc.perform(get("/api/v1/regions/sidos")).andExpect(status().isUnauthorized());
  }

  private long insertBuilding(
      String dongCd,
      int orderKey,
      String gridId,
      String address,
      int unitCount,
      String score,
      String riskLevelCd,
      String regionTypeCd,
      String houseTypeCd,
      String rxCodeCd,
      String useAprDay) {
    return jdbc.sql(
            """
            INSERT INTO buildings (bld_key,sido_cd,sigungu_cd,admin_dong_cd,address,lat,lng,
              house_type_cd,floor_count,unit_count,use_apr_day,grid_id,region_type_cd,score,
              risk_level_cd,order_key,is_estimated,basis,rx_code_cd,score_version,computed_at)
            VALUES (:bldKey,:sidoCd,:sigunguCd,:dongCd,:address,37.4,126.9,
              :houseTypeCd,3,:unitCount,:useAprDay,:gridId,:regionTypeCd,CAST(:score AS numeric),
              :riskLevelCd,:orderKey,:estimated,:basis,:rxCodeCd,'v0-20260805',now())
            RETURNING building_id
            """)
        .param("bldKey", "IT-" + orderKey)
        .param("sidoCd", SIDO)
        .param("sigunguCd", SIGUNGU)
        .param("dongCd", dongCd)
        .param("address", address)
        .param("houseTypeCd", houseTypeCd)
        .param("unitCount", unitCount)
        .param("useAprDay", useAprDay)
        .param("gridId", gridId)
        .param("regionTypeCd", regionTypeCd)
        .param("score", score)
        .param("riskLevelCd", riskLevelCd)
        .param("orderKey", orderKey)
        .param("estimated", useAprDay == null)
        .param("basis", "미보급 · 동선 " + orderKey)
        .param("rxCodeCd", rxCodeCd)
        .query(Long.class)
        .single();
  }

  private long insertUnit(
      long buildingId,
      int unitSeq,
      String hoNm,
      Short floorNo,
      String sourceCd,
      String statusCd,
      String lastInspectedDay) {
    return jdbc.sql(
            """
            INSERT INTO units (building_id,unit_seq,ho_nm,flr_no,ho_nm_source_cd,status_cd,
              last_inspected_day)
            VALUES (:buildingId,:unitSeq,:hoNm,:floorNo,:sourceCd,:statusCd,:lastInspectedDay)
            RETURNING unit_id
            """)
        .param("buildingId", buildingId)
        .param("unitSeq", unitSeq)
        .param("hoNm", hoNm)
        .param("floorNo", floorNo)
        .param("sourceCd", sourceCd)
        .param("statusCd", statusCd)
        .param("lastInspectedDay", lastInspectedDay)
        .query(Long.class)
        .single();
  }
}
