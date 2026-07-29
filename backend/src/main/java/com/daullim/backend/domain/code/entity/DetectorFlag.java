package com.daullim.backend.domain.code.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

/** 감지기 외관 체크 항목. isSevere가 외관이상의 DEFECTIVE 분기를 가른다. */
@Entity
@Immutable
@Table(name = "detector_flags")
public class DetectorFlag {

  @Id
  @Column(name = "detector_flag_cd", length = 20)
  private String code;

  @Column(name = "label", length = 40, nullable = false)
  private String label;

  @Column(name = "is_severe", nullable = false)
  private boolean severe;

  @Column(name = "sort_order", nullable = false)
  private short sortOrder;

  protected DetectorFlag() {}

  public String getCode() {
    return code;
  }

  public String getLabel() {
    return label;
  }

  public boolean isSevere() {
    return severe;
  }

  public short getSortOrder() {
    return sortOrder;
  }
}
