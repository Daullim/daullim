package com.daullim.backend.domain.visit.repository;

import com.daullim.backend.domain.visit.dto.ReplacementItemResponse;
import com.daullim.backend.domain.visit.dto.VisitDayCount;
import com.daullim.backend.domain.visit.dto.VisitDetailResponse;
import com.daullim.backend.domain.visit.dto.VisitListItem;
import com.daullim.backend.domain.visit.service.VisitCursor;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * 방문 조회 투영 — 엔티티가 아니라 DTO를 바로 만든다.
 *
 * <p>주소·호수·점검원 이름이 늘 함께 나가므로 조인은 상수다. {@code deleted_at IS NULL}은 모든 경로에 붙는다 — {@code ix_visits_*}
 * 부분 인덱스와 같은 기준이라야 인덱스를 탄다.
 */
@Repository
public class VisitQueryRepository {

  /** 목록·상세가 같은 조인을 쓴다. 세대→건물은 방문에서 주소를 얻는 유일한 경로다. */
  private static final String FROM_JOINS =
      """
      FROM visits v
      JOIN units un   ON un.unit_id = v.unit_id
      JOIN buildings b ON b.building_id = un.building_id
      JOIN users o    ON o.user_id = v.officer_id
      WHERE v.deleted_at IS NULL
      """;

  private static final String LIST_SELECT =
      """
      SELECT v.visit_id, v.unit_id, b.building_id, v.visited_day, v.visited_at,
             b.address, un.ho_nm, un.flr_no,
             v.consent_cd, v.is_inspected, v.condition_code_cd, v.rx_done_cd, o.name AS officer_name
      """
          + FROM_JOINS;

  private static final String DETAIL_SELECT =
      """
      SELECT v.visit_id, v.unit_id, b.building_id, b.address, un.ho_nm, un.flr_no,
             v.visited_day, v.visited_at, o.name AS officer_name,
             v.consent_cd, v.is_inspected, v.respondent_type_cd, v.refusal_reason_cd,
             v.refusal_note, v.room_count, v.mfg_ym, v.mfg_unmarked, v.replace_count,
             v.is_expired, v.effective_replace_count, v.condition_code_cd,
             v.extinguisher_installed_cd, v.rx_done_cd, v.revisit_plan_cd,
             v.no_revisit_note, v.note, v.rule_version
      """
          + FROM_JOINS
          + "  AND v.visit_id = :visitId\n";

  /** 외관 플래그는 항목마다 여러 행이라 따로 읽어 붙인다 — 한 방문의 항목 수가 실 개수 이하라 왕복 2회로 족하다. */
  private static final String ITEMS_SQL =
      """
      SELECT ri.replacement_item_id, ri.item_seq, ri.replace_reason_cd, ri.battery_type_cd,
             ri.rx_code_cd, ri.condition_code_cd, ri.is_auto_generated,
             f.detector_flag_cd
      FROM replacement_items ri
      LEFT JOIN replacement_item_flags f ON f.replacement_item_id = ri.replacement_item_id
      WHERE ri.visit_id = :visitId
      ORDER BY ri.item_seq, f.detector_flag_cd
      """;

  private static final String CALENDAR_SELECT =
      """
      SELECT v.visited_day, count(*) AS day_count
      """
          + FROM_JOINS;

  private final JdbcClient jdbc;

  VisitQueryRepository(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  /**
   * 목록 조회 조건. null인 항목은 걸지 않는다.
   *
   * <p>{@code from}·{@code to}는 YYYYMMDD다 — {@code visited_day}가 char(8)이라 문자열 비교가 곧 날짜 비교다.
   */
  public record VisitCriteria(
      Long officerId,
      Long unitId,
      String from,
      String to,
      String consentCd,
      String dongCd,
      VisitCursor.Position after,
      int limit) {}

  public List<VisitListItem> findPage(VisitCriteria c) {
    StringBuilder sql = new StringBuilder(LIST_SELECT);
    appendFilters(sql, c);
    if (c.after() != null) {
      // 행 비교 — ORDER BY와 같은 순서라야 인덱스를 그대로 탄다.
      sql.append("  AND (v.visited_at, v.visit_id) < (:afterAt, :afterId)\n");
    }
    sql.append("ORDER BY v.visited_at DESC, v.visit_id DESC\nLIMIT :limit");

    JdbcClient.StatementSpec spec =
        bindFilters(jdbc.sql(sql.toString()), c).param("limit", c.limit());
    if (c.after() != null) {
      // pgjdbc는 Instant를 직접 받지 못한다 — timestamptz와 짝이 맞는 OffsetDateTime으로 넘긴다.
      spec =
          spec.param("afterAt", c.after().visitedAt().atOffset(ZoneOffset.UTC))
              .param("afterId", c.after().visitId());
    }
    return spec.query((rs, rowNum) -> toListItem(rs)).list();
  }

  public List<VisitDayCount> countByDay(VisitCriteria c) {
    StringBuilder sql = new StringBuilder(CALENDAR_SELECT);
    appendFilters(sql, c);
    sql.append("GROUP BY v.visited_day\nORDER BY v.visited_day");

    return bindFilters(jdbc.sql(sql.toString()), c)
        .query(
            (rs, rowNum) -> new VisitDayCount(rs.getString("visited_day"), rs.getLong("day_count")))
        .list();
  }

  public Optional<VisitDetailResponse> findDetail(long visitId) {
    Optional<VisitDetailResponse> head =
        jdbc.sql(DETAIL_SELECT)
            .param("visitId", visitId)
            .query((rs, rowNum) -> toDetail(rs))
            .optional();
    return head.map(d -> withReplacements(d, findItems(visitId)));
  }

  /** 플래그가 항목당 여러 행으로 펼쳐져 오므로 항목 PK로 접는다. ORDER BY 덕에 삽입 순서가 곧 item_seq 순이다. */
  private List<ReplacementItemResponse> findItems(long visitId) {
    Map<Long, Accumulator> byItemId = new LinkedHashMap<>();
    for (Map<String, Object> row :
        jdbc.sql(ITEMS_SQL).param("visitId", visitId).query().listOfRows()) {
      Accumulator item =
          byItemId.computeIfAbsent(
              ((Number) row.get("replacement_item_id")).longValue(), id -> new Accumulator(row));
      String flag = (String) row.get("detector_flag_cd");
      if (flag != null) {
        item.flags.add(flag);
      }
    }
    return byItemId.values().stream().map(Accumulator::toResponse).toList();
  }

  /** 펼쳐진 행을 접는 동안의 임시 상태 — 항목 1건과 그 플래그 묶음. */
  private static final class Accumulator {
    private final Map<String, Object> row;
    private final List<String> flags = new ArrayList<>();

    private Accumulator(Map<String, Object> row) {
      this.row = row;
    }

    private ReplacementItemResponse toResponse() {
      return new ReplacementItemResponse(
          ((Number) row.get("item_seq")).shortValue(),
          (String) row.get("replace_reason_cd"),
          (String) row.get("battery_type_cd"),
          (String) row.get("rx_code_cd"),
          (String) row.get("condition_code_cd"),
          (Boolean) row.get("is_auto_generated"),
          List.copyOf(flags));
    }
  }

  private static VisitDetailResponse withReplacements(
      VisitDetailResponse d, List<ReplacementItemResponse> items) {
    return new VisitDetailResponse(
        d.visitId(),
        d.unitId(),
        d.buildingId(),
        d.address(),
        d.hoNm(),
        d.flrNo(),
        d.visitedDay(),
        d.visitedAt(),
        d.officerName(),
        d.consentCd(),
        d.inspected(),
        d.respondentTypeCd(),
        d.refusalReasonCd(),
        d.refusalNote(),
        d.roomCount(),
        d.mfgYm(),
        d.mfgUnmarked(),
        d.replaceCount(),
        d.expired(),
        d.effectiveReplaceCount(),
        d.conditionCode(),
        d.extinguisherInstalledCd(),
        d.rxDoneCd(),
        d.revisitPlanCd(),
        d.noRevisitNote(),
        d.note(),
        d.ruleVersion(),
        items);
  }

  /* ------------------------------ 필터 ------------------------------ */

  private static void appendFilters(StringBuilder sql, VisitCriteria c) {
    if (c.officerId() != null) {
      sql.append("  AND v.officer_id = :officerId\n");
    }
    if (c.unitId() != null) {
      sql.append("  AND v.unit_id = :unitId\n");
    }
    if (c.from() != null) {
      sql.append("  AND v.visited_day >= :from\n");
    }
    if (c.to() != null) {
      sql.append("  AND v.visited_day <= :to\n");
    }
    if (c.consentCd() != null) {
      sql.append("  AND v.consent_cd = :consentCd\n");
    }
    if (c.dongCd() != null) {
      sql.append("  AND b.admin_dong_cd = :dongCd\n");
    }
  }

  private static JdbcClient.StatementSpec bindFilters(
      JdbcClient.StatementSpec spec, VisitCriteria c) {
    if (c.officerId() != null) {
      spec = spec.param("officerId", c.officerId());
    }
    if (c.unitId() != null) {
      spec = spec.param("unitId", c.unitId());
    }
    if (c.from() != null) {
      spec = spec.param("from", c.from());
    }
    if (c.to() != null) {
      spec = spec.param("to", c.to());
    }
    if (c.consentCd() != null) {
      spec = spec.param("consentCd", c.consentCd());
    }
    if (c.dongCd() != null) {
      spec = spec.param("dongCd", c.dongCd());
    }
    return spec;
  }

  /* ------------------------------ 매핑 ------------------------------ */

  private static VisitListItem toListItem(ResultSet rs) throws SQLException {
    return new VisitListItem(
        rs.getLong("visit_id"),
        rs.getLong("unit_id"),
        rs.getLong("building_id"),
        rs.getString("visited_day"),
        instantAt(rs),
        rs.getString("address"),
        rs.getString("ho_nm"),
        shortOrNull(rs, "flr_no"),
        rs.getString("consent_cd"),
        rs.getBoolean("is_inspected"),
        rs.getString("condition_code_cd"),
        rs.getString("rx_done_cd"),
        rs.getString("officer_name"));
  }

  private static VisitDetailResponse toDetail(ResultSet rs) throws SQLException {
    return new VisitDetailResponse(
        rs.getLong("visit_id"),
        rs.getLong("unit_id"),
        rs.getLong("building_id"),
        rs.getString("address"),
        rs.getString("ho_nm"),
        shortOrNull(rs, "flr_no"),
        rs.getString("visited_day"),
        instantAt(rs),
        rs.getString("officer_name"),
        rs.getString("consent_cd"),
        rs.getBoolean("is_inspected"),
        rs.getString("respondent_type_cd"),
        rs.getString("refusal_reason_cd"),
        rs.getString("refusal_note"),
        shortOrNull(rs, "room_count"),
        rs.getString("mfg_ym"),
        rs.getBoolean("mfg_unmarked"),
        shortOrNull(rs, "replace_count"),
        (Boolean) rs.getObject("is_expired"),
        shortOrNull(rs, "effective_replace_count"),
        rs.getString("condition_code_cd"),
        rs.getString("extinguisher_installed_cd"),
        rs.getString("rx_done_cd"),
        rs.getString("revisit_plan_cd"),
        rs.getString("no_revisit_note"),
        rs.getString("note"),
        rs.getString("rule_version"),
        List.of());
  }

  /** pgjdbc는 timestamptz를 Instant로 바로 내주지 않는다 — OffsetDateTime을 거친다. */
  private static Instant instantAt(ResultSet rs) throws SQLException {
    OffsetDateTime at = rs.getObject("visited_at", OffsetDateTime.class);
    return at == null ? null : at.toInstant();
  }

  /** smallint는 미발생(N/A)이 null이라 원시형으로 받으면 0으로 뭉개진다. */
  private static Short shortOrNull(ResultSet rs, String column) throws SQLException {
    short value = rs.getShort(column);
    return rs.wasNull() ? null : value;
  }
}
