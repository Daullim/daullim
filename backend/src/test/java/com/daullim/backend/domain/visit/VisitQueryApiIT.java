package com.daullim.backend.domain.visit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.daullim.backend.domain.QueryApiSupport;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MvcResult;

/** G-2 목록 · 달력 집계 · H-1 상세. */
class VisitQueryApiIT extends QueryApiSupport {

  private static final Instant NOON = Instant.parse("2026-07-15T03:00:00Z");

  /** 같은 시각에 저장된 두 건 — 커서가 시각만 보면 여기서 깨진다. */
  private long tiedEarlier;

  private long tiedLater;
  private long refusedVisit;
  private long otherDongVisit;
  private long deletedVisit;

  @BeforeEach
  void setUpVisits() {
    // 같은 visited_at, 다른 PK. 오프라인 재전송이 한꺼번에 들어오면 실제로 이렇게 된다.
    tiedEarlier = insertVisit(b2FieldUnit, officerId, "20260715", NOON, "accepted", true);
    tiedLater = insertVisit(b2FieldUnit, officerId, "20260715", NOON, "accepted", true);

    // 거부는 사유가 INSERT 시점에 있어야 한다 (ck_v_gate2).
    refusedVisit =
        insertVisit(b1ExposUnit, officerId, "20260714", NOON.minusSeconds(86400), "refused", false);

    // 난곡동(b4) — dongCd 필터가 실제로 거르는지 보려면 다른 동에도 한 건 있어야 한다.
    otherDongVisit =
        insertVisit(unitOf(b4), officerId, "20260713", NOON.minusSeconds(172800), "vacant", false);

    deletedVisit =
        insertVisit(b2FieldUnit, officerId, "20260715", NOON.plusSeconds(60), "unreachable", false);
    jdbc.sql("UPDATE visits SET deleted_at = now() WHERE visit_id = :id")
        .param("id", deletedVisit)
        .update();
  }

  @Nested
  @DisplayName("G-2. 목록")
  class ListVisits {

    @Test
    @DisplayName("최신순으로 내려가고 soft delete된 건은 빠진다")
    void ordersByVisitedAtDescExcludingDeleted() throws Exception {
      mvc.perform(get("/api/v1/visits").with(officer()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.data.items.length()").value(4))
          .andExpect(jsonPath("$.data.items[0].visitedDay").value("20260715"))
          .andExpect(jsonPath("$.data.items[3].visitedDay").value("20260713"))
          .andExpect(jsonPath("$.data.nextCursor").doesNotExist());

      // 지운 건은 어떤 필터로도 나오지 않는다
      assertThat(idsOf(list("/api/v1/visits"))).doesNotContain(deletedVisit);
    }

    @Test
    @DisplayName("주소·호수·점검원 이름이 함께 온다 — 표가 조인을 더 하지 않는다")
    void carriesJoinedLabels() throws Exception {
      mvc.perform(get("/api/v1/visits?unitId={id}", b1ExposUnit).with(officer()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.data.items[0].address").value("서울특별시 관악구 신림로 1"))
          .andExpect(jsonPath("$.data.items[0].hoNm").value("101호"))
          .andExpect(jsonPath("$.data.items[0].flrNo").value(1))
          .andExpect(jsonPath("$.data.items[0].officerName").value("이영선"))
          .andExpect(jsonPath("$.data.items[0].consentCd").value("refused"));
    }

    @Test
    @DisplayName("visited_at이 같아도 커서로 이어 읽으면 겹치지도 빠지지도 않는다")
    void tiedTimestampsPaginateWithoutGaps() throws Exception {
      List<Long> all = new ArrayList<>();
      String cursor = null;
      for (int page = 0; page < 10; page++) {
        MvcResult res =
            mvc.perform(
                    get("/api/v1/visits?size=1" + (cursor == null ? "" : "&cursor=" + cursor))
                        .with(officer()))
                .andExpect(status().isOk())
                .andReturn();
        all.addAll(idsOf(res));
        cursor = cursorOf(res);
        if (cursor == null) {
          break;
        }
      }

      // 동점 두 건이 각각 정확히 한 번씩 — 시각만 보는 커서였다면 하나가 빠지거나 겹친다
      assertThat(all)
          .containsExactlyInAnyOrder(tiedLater, tiedEarlier, refusedVisit, otherDongVisit);
    }

    @Test
    @DisplayName("officerId=me는 토큰의 주인으로 풀린다")
    void resolvesMe() throws Exception {
      mvc.perform(get("/api/v1/visits?officerId=me").with(officer()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.data.items.length()").value(4));

      // 남의 것을 달라고 하면 빈 목록이다 (권한 경계가 아니라 필터다)
      mvc.perform(get("/api/v1/visits?officerId={id}", officerId + 999).with(officer()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.data.items.length()").value(0));
    }

    @Test
    @DisplayName("날짜·승낙상태·행정동으로 거른다")
    void filters() throws Exception {
      mvc.perform(get("/api/v1/visits?from=20260715&to=20260715").with(officer()))
          .andExpect(jsonPath("$.data.items.length()").value(2));

      mvc.perform(get("/api/v1/visits?consentCd=refused").with(officer()))
          .andExpect(jsonPath("$.data.items.length()").value(1))
          .andExpect(jsonPath("$.data.items[0].visitId").value(refusedVisit));

      // 신림동 3건 — 난곡동 건은 빠진다
      mvc.perform(get("/api/v1/visits?dongCd={dong}", DONG).with(officer()))
          .andExpect(jsonPath("$.data.items.length()").value(3));
    }

    @Test
    @DisplayName("sigunguCd로 거른다 — 관제 5. 실적 통계의 일자별 표가 쓰는 축")
    void filtersBySigungu() throws Exception {
      mvc.perform(get("/api/v1/visits?sigunguCd={sigungu}", SIGUNGU).with(officer()))
          .andExpect(jsonPath("$.data.items.length()").value(4));

      mvc.perform(get("/api/v1/visits?sigunguCd=11680").with(officer()))
          .andExpect(jsonPath("$.data.items.length()").value(0));
    }

    @Test
    @DisplayName("점검원을 가리지 않으면 관할 안 모든 점검원의 기록이 나온다")
    void listsEveryOfficerWhenNotFiltered() throws Exception {
      long otherOfficer =
          jdbc.sql(
                  """
                  INSERT INTO users (login_id,password_hash,name,phone,birth_on,role_cd)
                  VALUES (:loginId,'{bcrypt}stub','김점검','010-9999-8888',DATE '1988-03-03','officer')
                  RETURNING user_id
                  """)
              .param("loginId", "it-other-" + java.util.UUID.randomUUID())
              .query(Long.class)
              .single();
      insertVisit(b2FieldUnit, otherOfficer, "20260716", NOON.plusSeconds(90000), "accepted", true);

      // officerId를 주지 않으면 두 사람 것이 함께 — /records가 officerId=me로 좁히는 것과 갈린다
      mvc.perform(get("/api/v1/visits?sigunguCd={sigungu}", SIGUNGU).with(officer()))
          .andExpect(jsonPath("$.data.items.length()").value(5))
          .andExpect(jsonPath("$.data.items[0].officerName").value("김점검"));

      mvc.perform(get("/api/v1/visits?officerId=me").with(officer()))
          .andExpect(jsonPath("$.data.items.length()").value(4));
    }

    @Test
    @DisplayName("깨진 커서는 400이다")
    void rejectsBrokenCursor() throws Exception {
      mvc.perform(get("/api/v1/visits?cursor=not-a-cursor").with(officer()))
          .andExpect(status().isBadRequest())
          .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    @DisplayName("from 형식이 틀리면 400이다")
    void rejectsMalformedDate() throws Exception {
      mvc.perform(get("/api/v1/visits?from=2026-07-15").with(officer()))
          .andExpect(status().isBadRequest())
          .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }
  }

  @Nested
  @DisplayName("G-2. 달력 집계")
  class Calendar {

    @Test
    @DisplayName("일자별 건수를 오름차순으로 내리고 0인 날은 넣지 않는다")
    void countsByDay() throws Exception {
      mvc.perform(get("/api/v1/visits/calendar?from=20260701&to=20260731").with(officer()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.data.length()").value(3))
          .andExpect(jsonPath("$.data[0].day").value("20260713"))
          .andExpect(jsonPath("$.data[0].count").value(1))
          .andExpect(jsonPath("$.data[2].day").value("20260715"))
          // soft delete된 1건은 세지 않는다
          .andExpect(jsonPath("$.data[2].count").value(2));
    }

    @Test
    @DisplayName("sigunguCd로 좁혀진다 — 관제 5. 실적 통계의 달력이 쓰는 축")
    void filtersBySigungu() throws Exception {
      mvc.perform(
              get("/api/v1/visits/calendar?from=20260701&to=20260731&sigunguCd={sigungu}", SIGUNGU)
                  .with(officer()))
          .andExpect(jsonPath("$.data.length()").value(3));

      // 건물이 없는 관할은 찍을 날이 없다
      mvc.perform(
              get("/api/v1/visits/calendar?from=20260701&to=20260731&sigunguCd=11680")
                  .with(officer()))
          .andExpect(jsonPath("$.data.length()").value(0));
    }

    @Test
    @DisplayName("from·to는 필수다")
    void requiresRange() throws Exception {
      mvc.perform(get("/api/v1/visits/calendar?from=20260701").with(officer()))
          .andExpect(status().isBadRequest());
    }
  }

  /** 현장 '오늘' 카드 집계 — 픽스처: 승낙 2(실효교체 각 1)·거부 1·공가 1(난곡동)·연락두절 1(soft delete). */
  @Nested
  @DisplayName("G-2. 기간 집계")
  class Summary {

    @Test
    @DisplayName("총건수·승낙코드별 건수·실효 교체 합을 한 번에 낸다")
    void summarizesRange() throws Exception {
      mvc.perform(get("/api/v1/visits/summary?from=20260701&to=20260731").with(officer()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.data.total").value(4))
          .andExpect(jsonPath("$.data.byConsent.accepted").value(2))
          .andExpect(jsonPath("$.data.byConsent.refused").value(1))
          .andExpect(jsonPath("$.data.byConsent.vacant").value(1))
          // 점검하지 않은 방문은 effective_replace_count가 null이다 — 합이 null이 되면 안 된다.
          .andExpect(jsonPath("$.data.effectiveReplaceCount").value(2));
    }

    @Test
    @DisplayName("건수가 0인 승낙 코드는 담지 않는다 — 0 채우기는 화면 몫이다")
    void omitsZeroConsentCodes() throws Exception {
      // unreachable 건은 soft delete돼 집계에서 빠지므로 키 자체가 없어야 한다.
      mvc.perform(get("/api/v1/visits/summary?from=20260701&to=20260731").with(officer()))
          .andExpect(jsonPath("$.data.byConsent.unreachable").doesNotExist());
    }

    @Test
    @DisplayName("하루로 좁히면 그날 것만 — '오늘' 카드가 부르는 방식")
    void narrowsToSingleDay() throws Exception {
      mvc.perform(get("/api/v1/visits/summary?from=20260715&to=20260715").with(officer()))
          .andExpect(jsonPath("$.data.total").value(2))
          .andExpect(jsonPath("$.data.byConsent.accepted").value(2))
          .andExpect(jsonPath("$.data.effectiveReplaceCount").value(2));
    }

    @Test
    @DisplayName("기록이 없는 기간은 0이고 byConsent가 빈 객체다 — 화면이 분기하지 않게")
    void emptyRangeYieldsZeros() throws Exception {
      mvc.perform(get("/api/v1/visits/summary?from=20260101&to=20260131").with(officer()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.data.total").value(0))
          .andExpect(jsonPath("$.data.effectiveReplaceCount").value(0))
          .andExpect(jsonPath("$.data.byConsent").isMap())
          .andExpect(jsonPath("$.data.byConsent").isEmpty());
    }

    @Test
    @DisplayName("dongCd로 좁혀진다 — 목록·달력과 같은 필터를 탄다")
    void filtersByDong() throws Exception {
      mvc.perform(
              get("/api/v1/visits/summary?from=20260701&to=20260731&dongCd={dong}", OTHER_DONG)
                  .with(officer()))
          .andExpect(jsonPath("$.data.total").value(1))
          .andExpect(jsonPath("$.data.byConsent.vacant").value(1));
    }

    @Test
    @DisplayName("sigunguCd로 좁혀진다 — 관제 5. 실적 통계가 부르는 축")
    void filtersBySigungu() throws Exception {
      mvc.perform(
              get("/api/v1/visits/summary?from=20260701&to=20260731&sigunguCd={sigungu}", SIGUNGU)
                  .with(officer()))
          .andExpect(jsonPath("$.data.total").value(4))
          .andExpect(jsonPath("$.data.effectiveReplaceCount").value(2));
    }

    @Test
    @DisplayName("건물이 없는 시군구는 0이다 — 관할을 바꿔도 화면이 분기하지 않게")
    void emptySigunguYieldsZeros() throws Exception {
      mvc.perform(
              get("/api/v1/visits/summary?from=20260701&to=20260731&sigunguCd=11680")
                  .with(officer()))
          .andExpect(jsonPath("$.data.total").value(0))
          .andExpect(jsonPath("$.data.byConsent").isEmpty());
    }

    @Test
    @DisplayName("시군구와 동을 함께 주면 둘 다 걸린다 — 동이 그 시군구 밖이면 0건")
    void combinesSigunguAndDong() throws Exception {
      mvc.perform(
              get(
                      "/api/v1/visits/summary?from=20260701&to=20260731&sigunguCd={sigungu}&dongCd={dong}",
                      SIGUNGU,
                      OTHER_DONG)
                  .with(officer()))
          .andExpect(jsonPath("$.data.total").value(1));

      mvc.perform(
              get(
                      "/api/v1/visits/summary?from=20260701&to=20260731&sigunguCd=11680&dongCd={dong}",
                      OTHER_DONG)
                  .with(officer()))
          .andExpect(jsonPath("$.data.total").value(0));
    }

    @Test
    @DisplayName("from·to는 필수다")
    void requiresRange() throws Exception {
      mvc.perform(get("/api/v1/visits/summary?to=20260731").with(officer()))
          .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("시군구코드 형식이 어긋나면 400이다")
    void rejectsMalformedSigungu() throws Exception {
      mvc.perform(
              get("/api/v1/visits/summary?from=20260701&to=20260731&sigunguCd=gwanak")
                  .with(officer()))
          .andExpect(status().isBadRequest())
          .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }
  }

  @Nested
  @DisplayName("H-1. 상세")
  class Detail {

    @Test
    @DisplayName("원입력·파생 스냅샷·교체 항목·외관 플래그가 한 번에 온다")
    void returnsFullSnapshot() throws Exception {
      long itemId =
          jdbc.sql(
                  """
                  INSERT INTO replacement_items (visit_id,item_seq,replace_reason_cd,
                    battery_type_cd,rx_code_cd,condition_code_cd,is_auto_generated)
                  VALUES (:visitId,1,'appearance',NULL,'RX-IOT','DEFECTIVE',false)
                  RETURNING replacement_item_id
                  """)
              .param("visitId", tiedEarlier)
              .query(Long.class)
              .single();
      jdbc.sql(
              """
              INSERT INTO replacement_item_flags VALUES (:id,'cover-damage'), (:id,'stain')
              """)
          .param("id", itemId)
          .update();

      mvc.perform(get("/api/v1/visits/{id}", tiedEarlier).with(officer()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.data.visitId").value(tiedEarlier))
          .andExpect(jsonPath("$.data.address").value("서울특별시 관악구 신림로 22"))
          .andExpect(jsonPath("$.data.officerName").value("이영선"))
          .andExpect(jsonPath("$.data.inspected").value(true))
          .andExpect(jsonPath("$.data.roomCount").value(2))
          .andExpect(jsonPath("$.data.mfgYm").value("2020-01"))
          .andExpect(jsonPath("$.data.effectiveReplaceCount").value(1))
          .andExpect(jsonPath("$.data.conditionCode").value("DEFECTIVE"))
          .andExpect(jsonPath("$.data.ruleVersion").value("v1"))
          .andExpect(jsonPath("$.data.replacements.length()").value(1))
          .andExpect(jsonPath("$.data.replacements[0].replaceReasonCd").value("appearance"))
          .andExpect(jsonPath("$.data.replacements[0].autoGenerated").value(false))
          .andExpect(jsonPath("$.data.replacements[0].detectorFlagCds.length()").value(2));
    }

    @Test
    @DisplayName("교체 항목이 없는 방문은 빈 배열이다")
    void emptyReplacements() throws Exception {
      mvc.perform(get("/api/v1/visits/{id}", refusedVisit).with(officer()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.data.inspected").value(false))
          .andExpect(jsonPath("$.data.refusalReasonCd").value("no-time"))
          .andExpect(jsonPath("$.data.roomCount").doesNotExist())
          .andExpect(jsonPath("$.data.replacements.length()").value(0));
    }

    @Test
    @DisplayName("soft delete된 건은 상세도 404다")
    void deletedIsNotFound() throws Exception {
      mvc.perform(get("/api/v1/visits/{id}", deletedVisit).with(officer()))
          .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("없는 기록은 404다")
    void notFound() throws Exception {
      mvc.perform(get("/api/v1/visits/{id}", 999_999L).with(officer()))
          .andExpect(status().isNotFound());
    }
  }

  /* ------------------------------ 픽스처 ------------------------------ */

  /**
   * 방문 1건.
   *
   * <p>승낙이면 CHECK ②가 요구하는 최소 필드를, 비승낙이면 CHECK ①이 요구하는 전량 null을 넣는다 — 두 경우가 채우는 컬럼 자체가 달라 SQL을 갈라
   * 쓴다.
   */
  private long insertVisit(
      long unitId, long officer, String day, Instant at, String consentCd, boolean inspected) {
    String sql =
        inspected
            ? """
              INSERT INTO visits (unit_id,officer_id,visited_day,visited_at,consent_cd,is_inspected,
                respondent_type_cd,room_count,mfg_ym,replace_count,is_expired,
                effective_replace_count,extinguisher_installed_cd,rx_done_cd,condition_code_cd,
                revisit_plan_cd)
              VALUES (:unitId,:officerId,:day,:at,:consentCd,true,
                'owner',2,'2020-01',1,false,1,'installed','advised-only','DEFECTIVE','not-needed')
              RETURNING visit_id
              """
            : """
              INSERT INTO visits (unit_id,officer_id,visited_day,visited_at,consent_cd,is_inspected,
                refusal_reason_cd,revisit_plan_cd)
              VALUES (:unitId,:officerId,:day,:at,:consentCd,false,
                :refusalReasonCd,'not-needed')
              RETURNING visit_id
              """;
    JdbcClient.StatementSpec spec =
        jdbc.sql(sql)
            .param("unitId", unitId)
            .param("officerId", officer)
            .param("day", day)
            .param("at", at.atOffset(ZoneOffset.UTC))
            .param("consentCd", consentCd);
    if (!inspected) {
      // 거부만 사유가 필수이고(ck_v_gate2), 거부가 아니면 있어서도 안 된다(ck_v_gate1).
      spec = spec.param("refusalReasonCd", "refused".equals(consentCd) ? "no-time" : null);
    }
    return spec.query(Long.class).single();
  }

  private long unitOf(long buildingId) {
    return jdbc.sql("SELECT min(unit_id) FROM units WHERE building_id = :id")
        .param("id", buildingId)
        .query(Long.class)
        .single();
  }

  private MvcResult list(String url) throws Exception {
    return mvc.perform(get(url).with(officer())).andReturn();
  }

  private static List<Long> idsOf(MvcResult result) throws Exception {
    List<Integer> raw =
        com.jayway.jsonpath.JsonPath.read(
            result.getResponse().getContentAsString(), "$.data.items[*].visitId");
    return raw.stream().map(Integer::longValue).toList();
  }

  private static String cursorOf(MvcResult result) throws Exception {
    return com.jayway.jsonpath.JsonPath.read(
        result.getResponse().getContentAsString(), "$.data.nextCursor");
  }
}
