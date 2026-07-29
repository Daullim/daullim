package com.daullim.backend.domain.unit.entity;

import com.daullim.backend.domain.building.entity.Building;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** 세대(호) — 점검보고서 단위. */
@Entity
@Table(name = "units")
public class Unit {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "unit_id")
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "building_id", nullable = false)
  private Building building;

  @Column(name = "unit_seq", nullable = false)
  private short unitSeq;

  @Column(name = "ho_nm", length = 20)
  private String hoNm;

  @Column(name = "flr_no")
  private Short floorNo;

  @Column(name = "ho_nm_source_cd", length = 20, nullable = false)
  private String hoNmSourceCode;

  @Column(name = "status_cd", length = 20, nullable = false)
  private String statusCode;

  @JdbcTypeCode(SqlTypes.CHAR)
  @Column(name = "last_inspected_day", length = 8)
  private String lastInspectedDay;

  /** 연차 재산입 스캔의 기준일. 여기서 15년이 재도래하면 큐로 복귀. */
  @JdbcTypeCode(SqlTypes.CHAR)
  @Column(name = "rx_baseline_day", length = 8)
  private String rxBaselineDay;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected Unit() {}

  public Unit(
      Building building,
      short unitSeq,
      String hoNm,
      Short floorNo,
      String hoNmSourceCode,
      String statusCode) {
    this.building = building;
    this.unitSeq = unitSeq;
    this.hoNm = hoNm;
    this.floorNo = floorNo;
    this.hoNmSourceCode = hoNmSourceCode;
    this.statusCode = statusCode;
  }

  /** 다가구는 전유부가 없어 호수를 현장에서 받는다. */
  public void renameHo(String hoNm, String hoNmSourceCode) {
    this.hoNm = hoNm;
    this.hoNmSourceCode = hoNmSourceCode;
  }

  /** 점검 저장 시 캐시 갱신. */
  public void recordVisit(String statusCode, String visitedDay) {
    this.statusCode = statusCode;
    this.lastInspectedDay = visitedDay;
  }

  public void markRxBaseline(String day) {
    this.rxBaselineDay = day;
  }

  /** 재산입 스캔이 되돌리는 지점 — 기준일이 15년을 넘긴 완료 세대를 대기로 복귀. */
  public void resetToPending(String pendingStatusCode) {
    this.statusCode = pendingStatusCode;
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

  public Building getBuilding() {
    return building;
  }

  public short getUnitSeq() {
    return unitSeq;
  }

  public String getHoNm() {
    return hoNm;
  }

  public Short getFloorNo() {
    return floorNo;
  }

  public String getHoNmSourceCode() {
    return hoNmSourceCode;
  }

  public String getStatusCode() {
    return statusCode;
  }

  public String getLastInspectedDay() {
    return lastInspectedDay;
  }

  public String getRxBaselineDay() {
    return rxBaselineDay;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }
}
