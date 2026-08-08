package com.daullim.backend.domain.user.repository;

import com.daullim.backend.domain.user.entity.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {

  Optional<User> findByLoginId(String loginId);

  boolean existsByLoginId(String loginId);

  /** 인증 필터가 요청마다 부른다 — 엔티티를 만들지 않도록 exists로 둔다. */
  boolean existsByIdAndActiveIsTrue(Long id);
}
