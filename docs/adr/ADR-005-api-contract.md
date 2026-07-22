# ADR-005 API 계약 운영 — 스펙 우선(OpenAPI yaml) + 경량 운영

## 상태
승인 (2026-07-20, 결정자: 이윤서)

## 맥락
- 계약 7종·`visit_result` 페이로드는 확정(PRD v2 §4, ADR-003에서 building_id 개칭). WBS D1 = "API 계약 확정 최우선".
- BE = Spring Boot + Java (ADR-002) — FE와 네이티브 타입 공유 불가, 보완 필요.
- 1주차 FE 병렬 개발이 3주 성패 좌우. 상태 모델 보류(ADR-003 §5) 중에도 FE 진행 필요.

## 검토한 선택지
1. **스펙 우선 + 경량 운영 (채택)**
2. 코드 우선(springdoc 정본) — 계약이 BE 구현 후 생성, 1주차 병렬성 상실로 기각
3. 스펙 우선 + Mock 생략 — Prism 세팅이 사실상 0비용이라 절감 실익 없음

## 결정
1. `docs/openapi.yaml`을 계약 정본으로 D1에 작성·동결. 변경은 "계약 변경 PR"로만(양측 확인).
2. FE 타입: `openapi-typescript` → `frontend/src/api/types.gen.ts` 생성·커밋. 재생성은 npm script.
3. Mock: Prism(`npm run mock`)으로 yaml에서 기동 — 1주차 FE는 BE 없이 개발.
4. BE: 서버 코드젠 없이 수동 구현. springdoc Swagger UI는 구현-스펙 눈 대조용으로만 노출.
5. 드리프트 통제: 통합 체크포인트(D5·D10) 수동 대조. CI 자동 검증은 3주 대비 과잉 — 도입 안 함.

## 근거
- 계약 내용이 PRD v2 §4에 이미 존재 — yaml화는 반나절, 대가로 1주차 FE-BE 완전 병렬.
- "계약 우선 설계로 2인 병렬 개발" 포트폴리오 서사.

## 결과 (트레이드오프 수용)
- BE 구현-스펙 드리프트 가능성 수용(수동 대조 2회로 통제).
- yaml 유지보수 책임 발생 — 계약 변경 PR 규율로 통제.
