package com.daullim.backend.domain;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;

import com.daullim.backend.TestcontainersConfiguration;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

/** 조회 API IT 공용 픽스처 — buildings는 pipeline 소유라 SQL로 직접 생성함. */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public abstract class QueryApiSupport {

  protected static final String SIDO = "11";
  protected static final String SIGUNGU = "11620";
  protected static final String DONG = "1162069500";
  protected static final String OTHER_DONG = "1162077500";

  @Autowired protected MockMvc mvc;
  @Autowired protected JdbcClient jdbc;
  @Autowired protected EntityManager em;

  /** 큐 순서대로 B1·B2·B3(신림동) + B4(난곡동). */
  protected long b1;

  protected long b2;
  protected long b3;
  protected long b4;

  /** 현장 입력 대상(호수 미지정)과 대장 호수 — F-2 허용·차단 양쪽 검증용. */
  protected long b2FieldUnit;

  protected long b1ExposUnit;

  /** 토큰의 주인 — ActiveAccountFilter가 요청마다 생존 확인. */
  protected long officerId;

  /** 인증된 요청 — 기본 {@code jwt()} subject는 계정 조회를 통과 못 해 실제 officerId로 대체. */
  protected RequestPostProcessor officer() {
    return jwt().jwt(builder -> builder.subject(String.valueOf(officerId)));
  }

  @BeforeEach
  void setUpFixtures() {
    officerId =
        jdbc.sql(
                """
                INSERT INTO users (login_id,password_hash,name,phone,birth_on,role_cd)
                VALUES (:loginId,'{bcrypt}stub','이영선','010-1234-5678',DATE '1990-01-01','officer')
                RETURNING user_id
                """)
            .param("loginId", "it-" + java.util.UUID.randomUUID())
            .query(Long.class)
            .single();

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
