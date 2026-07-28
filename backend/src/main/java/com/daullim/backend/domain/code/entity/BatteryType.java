package com.daullim.backend.domain.code.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

/** 전지 유형(방전 시에만 수집). 일체형은 전지 교체가 불가해 RX-IOT로 처방이 뒤집힌다. */
@Entity
@Immutable
@Table(name = "battery_types")
public class BatteryType {

  @Id
  @Column(name = "battery_type_cd", length = 20)
  private String code;

  @Column(name = "label", length = 40, nullable = false)
  private String label;

  @Column(name = "rx_code_cd", length = 10)
  private String rxCode;

  @Column(name = "sort_order", nullable = false)
  private short sortOrder;

  protected BatteryType() {}

  public String getCode() {
    return code;
  }

  public String getLabel() {
    return label;
  }

  /** '모름'은 판별 전이라 null — 호출부가 사유 기준값으로 폴백한다. */
  public String getRxCode() {
    return rxCode;
  }

  public short getSortOrder() {
    return sortOrder;
  }
}
