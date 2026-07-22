# ADR-006 배포 토폴로지 — Railway(BE+Postgres) + Vercel(FE)

## 상태
승인 (2026-07-20, 결정자: 이윤서)

## 맥락
- 확정 골격: BE 단일 컨테이너 + FE 정적 호스팅 + 시연 URL 1개 (PRD v2).
- ADR-002 우려 발현 지점: Spring Boot+Java JVM 메모리 — 초저가 티어 빠듯.
- D15 공개 URL 무중단 시연이 유일 성공 조건 — 시연 안정성 > 비용.

## 검토한 선택지
1. **Railway(BE+Postgres) + Vercel(FE) — 채택.** 한 대시보드, GitHub 자동 배포, 월 ~$5.
2. Fly.io + Neon + Vercel — 구성 3곳 분산, 최저 사양에서 JVM 빠듯.
3. 자가 VM(Oracle Free 등) — 0원·RAM 여유이나 세팅 일 단위 + 시연 당일 장애 복구 전담 리스크.

## 결정
- BE: Railway 컨테이너(Dockerfile, JVM `-Xmx384m` 수준 튜닝) + Railway 관리형 Postgres.
- FE: Vercel 정적 호스팅 — **시연 URL = Vercel 도메인 1개** (BE 주소 비노출).
- 운영 규칙 4종:
  1. **시크릿**: 실값은 Railway/Vercel 환경변수에만. `.env.example`(키 이름만) 커밋, `.env*` gitignore. API 키·비밀번호 커밋 금지(D7 컨벤션 명문화).
  2. **CORS**: `ALLOWED_ORIGIN` 환경변수 주입 — 로컬/프로덕션 전환 무수정.
  3. **seed 동결(D13)**: pipeline 재실행 금지 선언 → `git tag demo-freeze` → `pg_dump` 스냅샷 `seed/demo-snapshot.sql` 커밋 → `reset-demo` 스크립트(visits truncate 후 재적재)로 리허설·본시연 매회 초기화.
  4. **헬스체크**: `/actuator/health` + Railway 헬스체크 — 시연 당일 아침 1분 점검 절차.

## 근거
- 월 $5 = 시연 안정성 보험료. D13 배포 작업 반나절 내 완료 가능.

## 결과 (트레이드오프 수용)
- 소액 과금 수용. Railway 장애 시 대안(FE에 목업 모드 or 로컬 시연 백업) 은 D14 리허설에서 점검.
