package com.daullim.backend.domain.user.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;

/** 점검원·예방담당자 계정. 회원탈퇴는 물리 삭제가 아니라 soft-delete다. */
@Entity
@Table(name = "users")
public class User {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "user_id")
  private Long id;

  @Column(name = "login_id", length = 50, nullable = false, unique = true)
  private String loginId;

  @Column(name = "password_hash", length = 255)
  private String passwordHash;

  @Column(name = "name", length = 50, nullable = false)
  private String name;

  @Column(name = "phone", length = 20, nullable = false)
  private String phone;

  @Column(name = "birth_on", nullable = false)
  private LocalDate birthOn;

  @Column(name = "rank_nm", length = 30)
  private String rankName;

  @Column(name = "title_nm", length = 30)
  private String titleName;

  @Column(name = "org_nm", length = 100)
  private String orgName;

  @Column(name = "role_cd", length = 20, nullable = false)
  private String roleCode;

  @Column(name = "is_active", nullable = false)
  private boolean active = true;

  @Column(name = "withdrawn_at")
  private Instant withdrawnAt;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected User() {}

  public User(
      String loginId,
      String passwordHash,
      String name,
      String phone,
      LocalDate birthOn,
      String roleCode) {
    this.loginId = loginId;
    this.passwordHash = passwordHash;
    this.name = name;
    this.phone = phone;
    this.birthOn = birthOn;
    this.roleCode = roleCode;
  }

  public void assignAffiliation(String rankName, String titleName, String orgName) {
    this.rankName = rankName;
    this.titleName = titleName;
    this.orgName = orgName;
  }

  /** visits.officer_id의 ON DELETE RESTRICT가 과거 점검 이력을 붙들고 있어 물리 삭제할 수 없다. */
  public void withdraw(Instant at) {
    this.active = false;
    this.withdrawnAt = at;
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

  public String getLoginId() {
    return loginId;
  }

  public String getPasswordHash() {
    return passwordHash;
  }

  public String getName() {
    return name;
  }

  public String getPhone() {
    return phone;
  }

  public LocalDate getBirthOn() {
    return birthOn;
  }

  public String getRankName() {
    return rankName;
  }

  public String getTitleName() {
    return titleName;
  }

  public String getOrgName() {
    return orgName;
  }

  public String getRoleCode() {
    return roleCode;
  }

  public boolean isActive() {
    return active;
  }

  public Instant getWithdrawnAt() {
    return withdrawnAt;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }
}
