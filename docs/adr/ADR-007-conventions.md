# ADR-007 컨벤션 패키지 — 스타일·커밋·브랜치·PR·작업 관리

## 상태
승인 (2026-07-20, 결정자: 이윤서)

## 맥락
- Java 채택으로 기존 ktlint 세팅 재사용 불가(ADR-002) — Java용 신규 세팅 필요.
- 2인 3주 — 원칙: 자동화 가능한 규율만 도입, 절차 최소화. 복잡한 git flow는 아젠다에서 반려 전제.

## 검토한 선택지
- 브랜치: GitHub Flow 경량형(채택) / git flow(develop·release 계층 — 2인에 순수 비용, 기각) / trunk 직커밋(리뷰 부재, 기각)
- CI: 미도입(채택) / GitHub Actions 린트·빌드 체크(3주 유지비용 > 이득, 발표 후 필요 시 추가)

## 결정
1. **Java 스타일**: Spotless + google-java-format. `spotlessApply` 자동 정렬, `spotlessCheck` build 연결.
2. **FE 스타일**: ESLint + Prettier 기본값(Vite 템플릿 + prettier). 커스텀 룰 금지.
3. **커밋**: Conventional Commits 경량형 `type(scope): 요약` — type 5개(feat/fix/chore/docs/refactor), scope 5개(be/fe/pipeline/seed/docs).
4. **브랜치**: `main` 단일 + 짧은 기능 브랜치(`feat/be-queue-api`) → PR → merge.
5. **PR**: main 직커밋 금지, 상호 리뷰 원칙 + **24h 무응답 시 셀프 머지 허용**. 예외: 계약 변경 PR(ADR-005)은 반드시 상호 승인.
6. **작업 관리**: GitHub Issues + 마일스톤 W1/W2/W3 + WBS Day 라벨. PR에 `closes #N`. 기획 문서는 Notion 유지.
7. **시크릿 규칙(ADR-006 연계)**: API 키·비밀번호 커밋 금지, `.env.example`만 커밋.
8. CI 미도입 — 로컬 pre-commit(spotless·eslint) 수준으로 갈음.

## 근거
- 논쟁 여지 없는 표준 도구로 스타일 논의 시간 0화. 커밋 이력 자체가 작업 로그·포트폴리오 자산.

## 결과 (트레이드오프 수용)
- CI 부재로 체크 우회 가능성 수용(2인 규모에서 실질 리스크 낮음). 발표 후 Actions 추가 여지.
