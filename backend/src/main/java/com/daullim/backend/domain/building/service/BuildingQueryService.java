package com.daullim.backend.domain.building.service;

import com.daullim.backend.common.error.BusinessException;
import com.daullim.backend.common.error.ErrorCode;
import com.daullim.backend.common.response.CursorPage;
import com.daullim.backend.domain.building.dto.BuildingDetailResponse;
import com.daullim.backend.domain.building.dto.BuildingQueueItem;
import com.daullim.backend.domain.building.repository.BuildingQueryRepository;
import com.daullim.backend.domain.building.repository.BuildingQueryRepository.QueueCriteria;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class BuildingQueryService {

  private final BuildingQueryRepository repository;

  BuildingQueryService(BuildingQueryRepository repository) {
    this.repository = repository;
  }

  public CursorPage<BuildingQueueItem> queue(
      String dongCd, String gridId, String q, String cursor, int size) {

    Integer afterOrderKey = cursor == null ? null : QueueCursor.decode(cursor);

    // 다음 페이지 유무를 알기 위해 한 건 더 읽는다 — count 쿼리를 한 번 더 도는 것보다 싸다.
    List<BuildingQueueItem> rows =
        repository.findQueue(
            new QueueCriteria(dongCd, gridId, normalizeAddressQuery(q), afterOrderKey, size + 1));

    boolean hasNext = rows.size() > size;
    List<BuildingQueueItem> items = hasNext ? List.copyOf(rows.subList(0, size)) : rows;
    String nextCursor = hasNext ? QueueCursor.encode(items.get(items.size() - 1).orderKey()) : null;

    return new CursorPage<>(items, nextCursor);
  }

  public BuildingDetailResponse detail(long buildingId) {
    return repository
        .findDetail(buildingId)
        .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "건물을 찾을 수 없습니다."));
  }

  /**
   * 주소 검색어 정규화 — {@code address_norm}이 공백을 제거한 GENERATED 컬럼이라 검색어도 같은 규칙으로 눌러야 매칭된다(FE B3 검색과 동일).
   * LIKE 메타문자는 이스케이프한다 — 사용자가 친 {@code %}가 전체 매칭이 되면 안 된다.
   */
  private static String normalizeAddressQuery(String q) {
    if (q == null) {
      return null;
    }
    String stripped = q.replaceAll("\\s", "");
    if (stripped.isEmpty()) {
      return null;
    }
    return stripped.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
  }
}
