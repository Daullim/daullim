package com.daullim.backend.domain.unit.repository;

import com.daullim.backend.domain.unit.entity.Unit;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface UnitRepository extends JpaRepository<Unit, Long> {

  List<Unit> findByBuildingIdOrderByUnitSeqAsc(Long buildingId);

  /** 부분 UNIQUE(building_id, ho_nm) 사전 검사 — 최종 판정은 DB 인덱스 */
  boolean existsByBuilding_IdAndHoNm(Long buildingId, String hoNm);

  /** 점검 저장·재산입 스캔 동시 갱신 방지 — 비관적 락 */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select u from Unit u where u.id = :id")
  Optional<Unit> findByIdForUpdate(Long id);

  List<Unit> findByStatusCodeAndRxBaselineDayLessThanEqual(String statusCode, String rxBaselineDay);
}
