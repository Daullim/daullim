package com.daullim.backend.domain.visit.service;

import com.daullim.backend.common.error.BusinessException;
import com.daullim.backend.common.error.ErrorCode;
import com.daullim.backend.common.response.CursorPage;
import com.daullim.backend.domain.visit.dto.VisitDayCount;
import com.daullim.backend.domain.visit.dto.VisitDetailResponse;
import com.daullim.backend.domain.visit.dto.VisitListItem;
import com.daullim.backend.domain.visit.dto.VisitSummary;
import com.daullim.backend.domain.visit.repository.VisitQueryRepository;
import com.daullim.backend.domain.visit.repository.VisitQueryRepository.VisitCriteria;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class VisitQueryService {

  private final VisitQueryRepository repository;

  VisitQueryService(VisitQueryRepository repository) {
    this.repository = repository;
  }

  /** 목록 조회 조건 — 컨트롤러가 {@code me}를 풀고 넘긴 뒤라 여기서는 전부 확정값이다. */
  public record VisitFilter(
      Long officerId, Long unitId, String from, String to, String consentCd, String dongCd) {}

  public CursorPage<VisitListItem> list(VisitFilter filter, String cursor, int size) {
    VisitCursor.Position after = cursor == null ? null : VisitCursor.decode(cursor);

    // 다음 페이지 유무를 알기 위해 한 건 더 읽는다 (큐 조회와 같은 방식).
    List<VisitListItem> rows = repository.findPage(criteria(filter, after, size + 1));

    boolean hasNext = rows.size() > size;
    List<VisitListItem> items = hasNext ? List.copyOf(rows.subList(0, size)) : rows;
    VisitListItem last = items.isEmpty() ? null : items.get(items.size() - 1);
    String nextCursor = hasNext ? VisitCursor.encode(last.visitedAt(), last.visitId()) : null;

    return new CursorPage<>(items, nextCursor);
  }

  /**
   * 달력 마킹용 일자별 건수.
   *
   * <p>목록과 같은 필터를 쓰되 커서를 받지 않는다 — 이 응답은 화면 한 달치라 페이지가 필요 없고, 오히려 잘리면 안 되는 값이다.
   */
  public List<VisitDayCount> countByDay(VisitFilter filter) {
    return repository.countByDay(criteria(filter, null, 0));
  }

  public VisitSummary summarize(VisitFilter filter) {
    return repository.summarize(criteria(filter, null, 0));
  }

  public VisitDetailResponse detail(long visitId) {
    return repository
        .findDetail(visitId)
        .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "점검 기록을 찾을 수 없습니다."));
  }

  private static VisitCriteria criteria(VisitFilter f, VisitCursor.Position after, int limit) {
    return new VisitCriteria(
        f.officerId(), f.unitId(), f.from(), f.to(), f.consentCd(), f.dongCd(), after, limit);
  }
}
