package com.daullim.backend.domain.building.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import org.hibernate.annotations.GeneratedColumn;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** 건축물대장 프리필 + 최신 위험 점수. pipeline이 월 1회 전량 UPSERT하는 테이블 (BE 읽기 전용) */
@Entity
@Immutable
@Table(name = "buildings")
public class Building {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "building_id")
  private Long id;

  @Column(name = "bld_key", length = 64, nullable = false, unique = true)
  private String bldKey;

  @Column(name = "sido_cd", length = 20, nullable = false)
  private String sidoCode;

  @Column(name = "sigungu_cd", length = 20, nullable = false)
  private String sigunguCode;

  @Column(name = "admin_dong_cd", length = 20, nullable = false)
  private String adminDongCode;

  @Column(name = "address", length = 200, nullable = false)
  private String address;

  @GeneratedColumn("regexp_replace(address,'\\s','','g')")
  @Column(name = "address_norm", length = 200, insertable = false, updatable = false)
  private String addressNorm;

  @Column(name = "lat", precision = 9, scale = 6, nullable = false)
  private BigDecimal lat;

  @Column(name = "lng", precision = 9, scale = 6, nullable = false)
  private BigDecimal lng;

  @Column(name = "house_type_cd", length = 20, nullable = false)
  private String houseTypeCode;

  @Column(name = "floor_count", nullable = false)
  private short floorCount;

  @Column(name = "unit_count", nullable = false)
  private short unitCount;

  @JdbcTypeCode(SqlTypes.CHAR)
  @Column(name = "use_apr_day", length = 8)
  private String useAprDay;

  @JdbcTypeCode(SqlTypes.CHAR)
  @Column(name = "install_day", length = 8)
  private String installDay;

  @Column(name = "install_year")
  private Short installYear;

  @Column(name = "detector_model", length = 50)
  private String detectorModel;

  @Column(name = "grid_id", length = 20)
  private String gridId;

  @Column(name = "region_type_cd", length = 10, nullable = false)
  private String regionTypeCode;

  @Column(name = "lambda_i", precision = 12, scale = 6)
  private BigDecimal lambdaI;

  @Column(name = "rr_i", precision = 12, scale = 6)
  private BigDecimal rrI;

  @Column(name = "score", precision = 5, scale = 2, nullable = false)
  private BigDecimal score;

  @Column(name = "risk_level_cd", length = 10, nullable = false)
  private String riskLevelCode;

  /** 위험 + 동선을 종합한 방문 순서. */
  @Column(name = "order_key", nullable = false)
  private int orderKey;

  @Column(name = "is_explore", nullable = false)
  private boolean explore;

  @Column(name = "is_estimated", nullable = false)
  private boolean estimated;

  @Column(name = "basis", length = 100)
  private String basis;

  @Column(name = "rx_code_cd", length = 10)
  private String rxCode;

  @Column(name = "score_version", length = 20, nullable = false)
  private String scoreVersion;

  @Column(name = "computed_at", nullable = false)
  private Instant computedAt;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected Building() {}

  public Long getId() {
    return id;
  }

  public String getBldKey() {
    return bldKey;
  }

  public String getSidoCode() {
    return sidoCode;
  }

  public String getSigunguCode() {
    return sigunguCode;
  }

  public String getAdminDongCode() {
    return adminDongCode;
  }

  public String getAddress() {
    return address;
  }

  public String getAddressNorm() {
    return addressNorm;
  }

  public BigDecimal getLat() {
    return lat;
  }

  public BigDecimal getLng() {
    return lng;
  }

  public String getHouseTypeCode() {
    return houseTypeCode;
  }

  public short getFloorCount() {
    return floorCount;
  }

  public short getUnitCount() {
    return unitCount;
  }

  public String getUseAprDay() {
    return useAprDay;
  }

  public String getInstallDay() {
    return installDay;
  }

  public Short getInstallYear() {
    return installYear;
  }

  public String getDetectorModel() {
    return detectorModel;
  }

  public String getGridId() {
    return gridId;
  }

  public String getRegionTypeCode() {
    return regionTypeCode;
  }

  public BigDecimal getLambdaI() {
    return lambdaI;
  }

  public BigDecimal getRrI() {
    return rrI;
  }

  public BigDecimal getScore() {
    return score;
  }

  public String getRiskLevelCode() {
    return riskLevelCode;
  }

  public int getOrderKey() {
    return orderKey;
  }

  public boolean isExplore() {
    return explore;
  }

  public boolean isEstimated() {
    return estimated;
  }

  public String getBasis() {
    return basis;
  }

  public String getRxCode() {
    return rxCode;
  }

  public String getScoreVersion() {
    return scoreVersion;
  }

  public Instant getComputedAt() {
    return computedAt;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }
}
