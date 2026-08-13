package com.daullim.backend.domain.region;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.daullim.backend.domain.QueryApiSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** C-1~C-3 지역 셀렉터 — 명칭은 사전, 집계는 DB. */
class RegionApiIT extends QueryApiSupport {

  @Test
  @DisplayName("시도는 행정표준코드로 내려간다 — 슬러그가 아니다")
  void sidos() throws Exception {
    mvc.perform(get("/api/v1/regions/sidos").with(officer()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.code").value("SUCCESS"))
        .andExpect(jsonPath("$.data[0].sidoCd").value("11"))
        .andExpect(jsonPath("$.data[0].sidoNm").value("서울특별시"))
        .andExpect(jsonPath("$.data[1].sidoCd").value("26"))
        .andExpect(jsonPath("$.data[1].sidoNm").value("부산광역시"))
        .andExpect(jsonPath("$.data[2].sidoCd").value("52"));
  }

  @Test
  @DisplayName("시군구 regionTypeCd는 BUFFER를 뺀 URBAN·RURAL 다수값이다")
  void sigungus() throws Exception {
    // 위치가 아니라 코드로 짚는다 — 사전 순서는 regions.csv를 따르므로 시연 지역이 늘면 바뀐다.
    mvc.perform(get("/api/v1/regions/sigungus").param("sidoCd", SIDO).with(officer()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data[?(@.sigunguCd=='" + SIGUNGU + "')].sigunguNm").value("관악구"))
        // URBAN 2(B1·B2) vs RURAL 1(B3), BUFFER인 B4는 세지 않는다.
        .andExpect(
            jsonPath("$.data[?(@.sigunguCd=='" + SIGUNGU + "')].regionTypeCd").value("URBAN"));
  }

  @Test
  @DisplayName("행정동은 사전 21개 전부 내려가고 가구 수는 세대·평균 위험도는 건물 기준이다")
  void dongs() throws Exception {
    mvc.perform(get("/api/v1/regions/dongs").param("sigunguCd", SIGUNGU).with(officer()))
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
  @DisplayName("동별 집계는 건물 축과 세대 축을 따로 센다")
  void dongAggregatesKeepAxesApart() throws Exception {
    insertInspectedVisit(b2FieldUnit, 2);
    insertRevisitVisit(b2FieldUnit);

    String dong = "$.data[?(@.dongCd=='" + DONG + "')]";
    mvc.perform(get("/api/v1/regions/dongs").param("sigunguCd", SIGUNGU).with(officer()))
        .andExpect(status().isOk())
        // 건물 축 — 3채 중 danger는 B1 하나
        .andExpect(jsonPath(dong + ".buildingCount").value(3))
        .andExpect(jsonPath(dong + ".dangerCount").value(1))
        // 세대 축 — B1의 2호 캐시 + B2 현장 방문 1호
        .andExpect(jsonPath(dong + ".doneUnitCount").value(3))
        .andExpect(jsonPath(dong + ".pendingUnitCount").value(2))
        // 실제 교체에 사용된 경보기 개수 — 예상 소요가 아니다.
        .andExpect(jsonPath(dong + ".replacementUsedCount").value(2))
        // 최신 방문 기준 재방문 대기 세대
        .andExpect(jsonPath(dong + ".revisitPendingUnitCount").value(1))
        // 픽스처 rr_i = score/10 → (9.12 + 5.50 + 2.00) / 3 = 5.54 → 5.5
        .andExpect(jsonPath(dong + ".avgRrI").value(5.5));
  }

  @Test
  @DisplayName("건물이 없는 동은 avgRrI가 null이다 — 0으로 채우면 위험이 가장 낮은 동으로 오른다")
  void emptyDongHasNullRr() throws Exception {
    mvc.perform(get("/api/v1/regions/dongs").param("sigunguCd", SIGUNGU).with(officer()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data[?(@.dongCd=='1162052500')].avgRrI").value((Object) null))
        .andExpect(jsonPath("$.data[?(@.dongCd=='1162052500')].pendingUnitCount").value(0));
  }

  @Test
  @DisplayName("코드 형식이 어긋나면 400이다")
  void rejectsMalformedCode() throws Exception {
    mvc.perform(get("/api/v1/regions/dongs").param("sigunguCd", "gwanak").with(officer()))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  @Test
  @DisplayName("토큰이 없으면 조회 API도 401이다")
  void requiresAuthentication() throws Exception {
    mvc.perform(get("/api/v1/regions/sidos")).andExpect(status().isUnauthorized());
  }

  private void insertInspectedVisit(long unitId, int effectiveReplaceCount) {
    jdbc.sql(
            """
            INSERT INTO visits (unit_id,officer_id,visited_day,visited_at,consent_cd,is_inspected,
              respondent_type_cd,room_count,mfg_ym,replace_count,is_expired,
              effective_replace_count,extinguisher_installed_cd,rx_done_cd,condition_code_cd,
              revisit_plan_cd)
            VALUES (:unitId,:officerId,'20260801',TIMESTAMPTZ '2026-08-01T01:00:00Z','accepted',true,
              'owner',3,'2020-01',:replaceCount,false,
              :replaceCount,'installed','done','REPLACE_ADVISED','not-needed')
            """)
        .param("unitId", unitId)
        .param("officerId", officerId)
        .param("replaceCount", effectiveReplaceCount)
        .update();
  }

  private void insertRevisitVisit(long unitId) {
    jdbc.sql(
            """
            INSERT INTO visits (unit_id,officer_id,visited_day,visited_at,consent_cd,is_inspected,
              respondent_type_cd,room_count,mfg_ym,replace_count,is_expired,
              effective_replace_count,extinguisher_installed_cd,rx_done_cd,condition_code_cd,
              revisit_plan_cd)
            VALUES (:unitId,:officerId,'20260802',TIMESTAMPTZ '2026-08-02T01:00:00Z','accepted',true,
              'owner',3,'2020-01',0,false,
              0,'installed','advised-only','OK_GOOD','revisit')
            """)
        .param("unitId", unitId)
        .param("officerId", officerId)
        .update();
  }
}
