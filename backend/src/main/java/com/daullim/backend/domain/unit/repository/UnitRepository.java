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

  /** 부분 UNIQUE(building_id, ho_nm)를 미리 보는 선검사. 경합은 DB 인덱스가 최종 판정한다. */
  boolean existsByBuilding_IdAndHoNm(Long buildingId, String hoNm);

  /** 캐시 쓰기 주체가 점검 저장과 재산입 스캔 둘이라, 갱신 전에 행을 잠가 갱신 분실을 막는다. */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select u from Unit u where u.id = :id")
  Optional<Unit> findByIdForUpdate(Long id);

  List<Unit> findByStatusCodeAndRxBaselineDayLessThanEqual(String statusCode, String rxBaselineDay);
}
