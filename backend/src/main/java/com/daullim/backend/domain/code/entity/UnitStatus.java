package com.daullim.backend.domain.code.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

/** 세대 진행 상태. 상태 모델은 팀 미합의라 seed가 잠정값이다 — 합의되면 DDL이 아니라 seed 행을 고친다 (ADR-012 결정 11). */
@Entity
@Immutable
@Table(name = "unit_statuses")
public class UnitStatus {

  @Id
  @Column(name = "unit_status_cd", length = 20)
  private String code;

  @Column(name = "label", length = 20, nullable = false)
  private String label;

  @Column(name = "is_terminal", nullable = false)
  private boolean terminal;

  @Column(name = "sort_order", nullable = false)
  private short sortOrder;

  protected UnitStatus() {}

  public String getCode() {
    return code;
  }

  public String getLabel() {
    return label;
  }

  public boolean isTerminal() {
    return terminal;
  }

  public short getSortOrder() {
    return sortOrder;
  }
}
