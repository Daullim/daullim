package com.daullim.backend.domain.user.repository;

import com.daullim.backend.domain.user.entity.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {

  Optional<User> findByLoginId(String loginId);

  boolean existsByLoginId(String loginId);

  /** 인증 필터가 요청마다 호출 — 엔티티 생성 방지용 exists 조회 */
  boolean existsByIdAndActiveIsTrue(Long id);
}
