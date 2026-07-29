package com.daullim.backend.domain.code.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

/** 경보기 교체 사유. rx_code_cd는 처방의 1차 소스이고, 방전만 {@link BatteryType}이 오버라이드한다. */
@Entity
@Immutable
@Table(name = "replace_reasons")
public class ReplaceReason {

  @Id
  @Column(name = "replace_reason_cd", length = 20)
  private String code;

  @Column(name = "label", length = 40, nullable = false)
  private String label;

  @Column(name = "rx_code_cd", length = 10)
  private String rxCode;

  @Column(name = "sort_order", nullable = false)
  private short sortOrder;

  protected ReplaceReason() {}

  public String getCode() {
    return code;
  }

  public String getLabel() {
    return label;
  }

  /** RX-BAT / RX-IOT, 처방 없음이면 null(기타). */
  public String getRxCode() {
    return rxCode;
  }

  public short getSortOrder() {
    return sortOrder;
  }
}
