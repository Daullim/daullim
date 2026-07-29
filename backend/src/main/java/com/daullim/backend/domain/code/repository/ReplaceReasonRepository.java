package com.daullim.backend.domain.code.repository;

import com.daullim.backend.domain.code.entity.ReplaceReason;
import java.util.List;
import java.util.Optional;
import org.springframework.data.repository.Repository;

/**
 * lookup은 Flyway seed가 소유한다. JpaRepository 대신 빈 마커를 상속해 save/delete를 아예 노출하지 않는다 — 쓰기가 코드리뷰가 아니라
 * 컴파일 에러로 막힌다.
 */
public interface ReplaceReasonRepository extends Repository<ReplaceReason, String> {

  List<ReplaceReason> findAll();

  Optional<ReplaceReason> findById(String code);
}
