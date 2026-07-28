package com.daullim.backend.domain.code.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

/** 연차 추정 구간(제조년월 라벨 판독 불가 시 폴백). */
@Entity
@Immutable
@Table(name = "age_bands")
public class AgeBand {

  @Id
  @Column(name = "age_band_cd", length = 10)
  private String code;

  @Column(name = "label", length = 30, nullable = false)
  private String label;

  @Column(name = "min_years")
  private Short minYears;

  @Column(name = "sort_order", nullable = false)
  private short sortOrder;

  protected AgeBand() {}

  public String getCode() {
    return code;
  }

  public String getLabel() {
    return label;
  }

  /** 구간의 하한 연차. null은 '연차 판정 불가'(모름)이며 경과 판정을 하지 않는다. */
  public Short getMinYears() {
    return minYears;
  }

  public short getSortOrder() {
    return sortOrder;
  }
}
