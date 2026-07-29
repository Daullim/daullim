package com.daullim.backend.domain.visit.repository;

import com.daullim.backend.domain.visit.entity.Visit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** visits는 append-only다. UPDATE는 soft delete뿐이고 조회는 항상 deletedAt IS NULL로 건다. */
public interface VisitRepository extends JpaRepository<Visit, Long> {

  /** 오프라인 재전송 멱등 — 같은 키가 이미 있으면 새로 저장하지 않는다. */
  Optional<Visit> findByClientVisitId(UUID clientVisitId);

  List<Visit> findByUnitIdAndDeletedAtIsNullOrderByVisitedAtDesc(Long unitId);

  List<Visit> findByOfficerIdAndVisitedDayAndDeletedAtIsNull(Long officerId, String visitedDay);
}
