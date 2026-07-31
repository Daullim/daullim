package com.daullim.backend.domain.visit.entity;

import com.daullim.backend.domain.unit.entity.Unit;
import com.daullim.backend.domain.user.entity.User;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.GeneratedColumn;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * 방문 1건 — 점검 폼의 저장 실물. append-only이고 UPDATE는 soft delete뿐이다.
 *
 * <p>필드가 많아 설정자를 나열하는 대신 폼 Step 0~4에 대응하는 조립 메서드로 묶었다.
 */
@Entity
@Table(name = "visits")
public class Visit {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "visit_id")
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "unit_id", nullable = false)
  private Unit unit;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "officer_id", nullable = false)
  private User officer;

  /** 실제 방문한 순서. 사전 배정이 아니라 사후 기록. */
  @Column(name = "route_order")
  private Short routeOrder;

  @Column(name = "visited_at", nullable = false)
  private Instant visitedAt;

  /** KST 달력일 YYYYMMDD. FE todayDay()와 무변환 정합. */
  @JdbcTypeCode(SqlTypes.CHAR)
  @Column(name = "visited_day", length = 8, nullable = false)
  private String visitedDay;

  /** 오프라인 동기화 멱등 키. 재전송이 중복 저장이 되지 않게 막는다. */
  @Column(name = "client_visit_id", unique = true)
  private UUID clientVisitId;

  @Column(name = "dispatched_score", precision = 5, scale = 2)
  private BigDecimal dispatchedScore;

  @Column(name = "dispatched_order_key")
  private Integer dispatchedOrderKey;

  @Column(name = "score_version", length = 20)
  private String scoreVersion;

  @Column(name = "consent_cd", length = 20, nullable = false)
  private String consentCode;

  /** consent_statuses.is_inspectable에서 파생. false면 경보기·소화기 필드가 전량 null이어야 한다. */
  @Column(name = "is_inspected", nullable = false)
  private boolean inspected;

  @Column(name = "respondent_type_cd", length = 20)
  private String respondentTypeCode;

  @Column(name = "refusal_reason_cd", length = 20)
  private String refusalReasonCode;

  @Column(name = "self_report_period_cd", length = 20)
  private String selfReportPeriodCode;

  @Column(name = "self_report_tested_cd", length = 10)
  private String selfReportTestedCode;

  @Column(name = "refusal_note")
  private String refusalNote;

  /** 법상 설치 의무 수량 = 교체 개수의 분모. */
  @Column(name = "room_count")
  private Short roomCount;

  @JdbcTypeCode(SqlTypes.CHAR)
  @Column(name = "mfg_ym", length = 7)
  private String mfgYm;

  /** 라벨 판독 불가 시 추정 폴백. mfgYm과 공존할 수 없다. */
  @Column(name = "age_band_cd", length = 10)
  private String ageBandCode;

  @GeneratedColumn("(mfg_ym is null and age_band_cd is not null)")
  @Column(name = "is_age_estimated", insertable = false, updatable = false)
  private Boolean ageEstimated;

  @Column(name = "replace_count")
  private Short replaceCount;

  @Column(name = "is_expired")
  private Boolean expired;

  /** 내용연수 경과면 roomCount 전량, 아니면 replaceCount. */
  @Column(name = "effective_replace_count")
  private Short effectiveReplaceCount;

  @Column(name = "extinguisher_installed_cd", length = 20)
  private String extinguisherInstalledCode;

  @Column(name = "rx_done_cd", length = 20)
  private String rxDoneCode;

  @Column(name = "revisit_plan_cd", length = 20)
  private String revisitPlanCode;

  @Column(name = "note")
  private String note;

  /** 세대 종합 판정 = 항목 최악값. */
  @Column(name = "condition_code_cd", length = 20)
  private String conditionCode;

  /** 규칙이 바뀌어도 과거 판정을 재해석하지 않기 위한 스냅샷. */
  @Column(name = "rule_version", length = 20, nullable = false)
  private String ruleVersion;

  @Column(name = "gps_lat", precision = 9, scale = 6)
  private BigDecimal gpsLat;

  @Column(name = "gps_lng", precision = 9, scale = 6)
  private BigDecimal gpsLng;

  @Column(name = "deleted_at")
  private Instant deletedAt;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "deleted_by_user_id")
  private User deletedBy;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @OneToMany(
      mappedBy = "visit",
      cascade = CascadeType.ALL,
      orphanRemoval = true,
      fetch = FetchType.LAZY)
  private List<ReplacementItem> replacementItems = new ArrayList<>();

  protected Visit() {}

  public Visit(
      Unit unit,
      User officer,
      String visitedDay,
      Instant visitedAt,
      String consentCode,
      boolean inspected,
      String ruleVersion) {
    this.unit = unit;
    this.officer = officer;
    this.visitedDay = visitedDay;
    this.visitedAt = visitedAt;
    this.consentCode = consentCode;
    this.inspected = inspected;
    this.ruleVersion = ruleVersion;
  }

  /** 자가신고 2필드는 폼에서 자체교체 사유가 빠져 늘 null */
  public void applyGate(
      String respondentTypeCode,
      String refusalReasonCode,
      String selfReportPeriodCode,
      String selfReportTestedCode,
      String refusalNote) {
    this.respondentTypeCode = respondentTypeCode;
    this.refusalReasonCode = refusalReasonCode;
    this.selfReportPeriodCode = selfReportPeriodCode;
    this.selfReportTestedCode = selfReportTestedCode;
    this.refusalNote = refusalNote;
  }

  /** 판정 서비스가 계산한 스냅샷만 들어온다 — 클라이언트 값을 받지 않는다. */
  public void applyAlarmJudgment(
      Short roomCount,
      String mfgYm,
      String ageBandCode,
      Short replaceCount,
      Boolean expired,
      Short effectiveReplaceCount,
      String conditionCode) {
    this.roomCount = roomCount;
    this.mfgYm = mfgYm;
    this.ageBandCode = ageBandCode;
    this.replaceCount = replaceCount;
    this.expired = expired;
    this.effectiveReplaceCount = effectiveReplaceCount;
    this.conditionCode = conditionCode;
  }

  public void applyPostCare(
      String extinguisherInstalledCode, String rxDoneCode, String revisitPlanCode, String note) {
    this.extinguisherInstalledCode = extinguisherInstalledCode;
    this.rxDoneCode = rxDoneCode;
    this.revisitPlanCode = revisitPlanCode;
    this.note = note;
  }

  public void applyDispatchSnapshot(
      UUID clientVisitId,
      Short routeOrder,
      BigDecimal dispatchedScore,
      Integer dispatchedOrderKey,
      String scoreVersion,
      BigDecimal gpsLat,
      BigDecimal gpsLng) {
    this.clientVisitId = clientVisitId;
    this.routeOrder = routeOrder;
    this.dispatchedScore = dispatchedScore;
    this.dispatchedOrderKey = dispatchedOrderKey;
    this.scoreVersion = scoreVersion;
    this.gpsLat = gpsLat;
    this.gpsLng = gpsLng;
  }

  public void addReplacementItem(ReplacementItem item) {
    item.assignTo(this);
    this.replacementItems.add(item);
  }

  public void softDelete(User by, Instant at) {
    this.deletedBy = by;
    this.deletedAt = at;
  }

  @PrePersist
  void onCreate() {
    Instant now = Instant.now();
    this.createdAt = now;
    this.updatedAt = now;
  }

  @PreUpdate
  void onUpdate() {
    this.updatedAt = Instant.now();
  }

  public Long getId() {
    return id;
  }

  public Unit getUnit() {
    return unit;
  }

  public User getOfficer() {
    return officer;
  }

  public Short getRouteOrder() {
    return routeOrder;
  }

  public Instant getVisitedAt() {
    return visitedAt;
  }

  public String getVisitedDay() {
    return visitedDay;
  }

  public UUID getClientVisitId() {
    return clientVisitId;
  }

  public BigDecimal getDispatchedScore() {
    return dispatchedScore;
  }

  public Integer getDispatchedOrderKey() {
    return dispatchedOrderKey;
  }

  public String getScoreVersion() {
    return scoreVersion;
  }

  public String getConsentCode() {
    return consentCode;
  }

  public boolean isInspected() {
    return inspected;
  }

  public String getRespondentTypeCode() {
    return respondentTypeCode;
  }

  public String getRefusalReasonCode() {
    return refusalReasonCode;
  }

  public String getSelfReportPeriodCode() {
    return selfReportPeriodCode;
  }

  public String getSelfReportTestedCode() {
    return selfReportTestedCode;
  }

  public String getRefusalNote() {
    return refusalNote;
  }

  public Short getRoomCount() {
    return roomCount;
  }

  public String getMfgYm() {
    return mfgYm;
  }

  public String getAgeBandCode() {
    return ageBandCode;
  }

  public Boolean getAgeEstimated() {
    return ageEstimated;
  }

  public Short getReplaceCount() {
    return replaceCount;
  }

  public Boolean getExpired() {
    return expired;
  }

  public Short getEffectiveReplaceCount() {
    return effectiveReplaceCount;
  }

  public String getExtinguisherInstalledCode() {
    return extinguisherInstalledCode;
  }

  public String getRxDoneCode() {
    return rxDoneCode;
  }

  public String getRevisitPlanCode() {
    return revisitPlanCode;
  }

  public String getNote() {
    return note;
  }

  public String getConditionCode() {
    return conditionCode;
  }

  public String getRuleVersion() {
    return ruleVersion;
  }

  public BigDecimal getGpsLat() {
    return gpsLat;
  }

  public BigDecimal getGpsLng() {
    return gpsLng;
  }

  public Instant getDeletedAt() {
    return deletedAt;
  }

  public User getDeletedBy() {
    return deletedBy;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public List<ReplacementItem> getReplacementItems() {
    return replacementItems;
  }
}
