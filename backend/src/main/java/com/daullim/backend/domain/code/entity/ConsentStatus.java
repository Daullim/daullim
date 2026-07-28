package com.daullim.backend.domain.code.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

/**
 * 방문 승낙 게이트 4지선다. unitStatusCode가 게이트→세대 상태 전이표이며, 이 전이를 Java에 하드코딩하지 않는 것이 상태 모델 미합의를 seed 안에 가두는
 * 방법이다 (ADR-012 결정 11).
 */
@Entity
@Immutable
@Table(name = "consent_statuses")
public class ConsentStatus {

  @Id
  @Column(name = "consent_cd", length = 20)
  private String code;

  @Column(name = "label", length = 20, nullable = false)
  private String label;

  @Column(name = "is_inspectable", nullable = false)
  private boolean inspectable;

  /** 코드값이라 연관관계가 아니라 문자열로 둔다 — 매핑 3중 사본을 만들지 않는다. */
  @Column(name = "unit_status_cd", length = 20, nullable = false)
  private String unitStatusCode;

  @Column(name = "sort_order", nullable = false)
  private short sortOrder;

  protected ConsentStatus() {}

  public String getCode() {
    return code;
  }

  public String getLabel() {
    return label;
  }

  /** 경보기·소화기 점검이 물리적으로 가능한 상태인지 — visits.is_inspected의 근거. */
  public boolean isInspectable() {
    return inspectable;
  }

  public String getUnitStatusCode() {
    return unitStatusCode;
  }

  public short getSortOrder() {
    return sortOrder;
  }
}
