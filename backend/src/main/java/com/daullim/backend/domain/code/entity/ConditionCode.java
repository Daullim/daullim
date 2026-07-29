package com.daullim.backend.domain.code.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

/** 자동 판정 4단계. severityRank는 세대 종합 판정(항목 최악값)의 비교 기준이다. */
@Entity
@Immutable
@Table(name = "condition_codes")
public class ConditionCode {

  @Id
  @Column(name = "condition_code_cd", length = 20)
  private String code;

  @Column(name = "label", length = 30, nullable = false)
  private String label;

  @Column(name = "severity_rank", nullable = false)
  private short severityRank;

  protected ConditionCode() {}

  public String getCode() {
    return code;
  }

  public String getLabel() {
    return label;
  }

  public short getSeverityRank() {
    return severityRank;
  }
}
