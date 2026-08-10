package com.daullim.backend.domain.visit.dto;

import java.util.Map;

/**
 * 기간 방문 집계 — 현장 '오늘' 카드가 쓰는 한 줄 요약.
 *
 * <p><b>목록으로 만들 수 없다.</b> {@code GET /visits}는 커서로 잘려 오므로 첫 페이지만 세면 실제보다 적게 나온다 — 달력 집계를 따로 둔 이유와
 * 같다.
 *
 * <p><b>'오늘'을 서버가 정하지 않는다.</b> 기간을 {@code from}·{@code to}로 받아 하루도 한 달도 같은 코드로 답한다. 오늘의 경계는 KST
 * 달력일인데({@code visits.visited_day}와 같은 기준) 서버 시간대로 오늘을 계산하면 그 기준과 어긋날 수 있다. 화면이 자기 달력일을 보내는 편이
 * 안전하다.
 *
 * @param total 기간 내 방문 건수
 * @param byConsent 승낙 게이트 코드별 건수. <b>0인 코드는 담지 않는다</b> — 화면은 자기 열거값({@code config/domain.ts}의
 *     {@code CONSENT_STATUS}) 4종을 돌면서 없는 코드를 0으로 채운다. 서버가 코드 목록을 박아 두면 lookup 테이블과 두 곳이 되기 때문이다.
 * @param effectiveReplaceCount 기간 내 <b>실효</b> 교체 대수 합. 원입력이 아니라 서버 판정 결과다(ADR-013) — 미점검 방문은 값이 없어
 *     합에 기여하지 않는다.
 */
public record VisitSummary(long total, Map<String, Long> byConsent, long effectiveReplaceCount) {}
