# CLAUDE.md

> 이 파일은 얇은 하네스다. 상세 규칙은 복붙하지 않고 진실원본을 가리킨다.
> 태그: `[BASE]` = 다른 프로젝트에도 재사용 가능한 범용 규칙 / `[DAULLIM]` = 이 서비스 전용.

## Project Overview `[DAULLIM]`

다울림 — 소방 취약가구 화재경보기 사후관리 **우선순위 처방 도구**(소방안전 빅데이터 경진대회 출품, 3주 MVP, 1인 개발). 주 사용자는 소방 점검원·예방담당자. 두 모드: `/control` 관제(데스크톱)·`/field` 현장(**태블릿 1024×768 가로 우선, 장갑 조작·명료함**).
`frontend/` `backend/` `pipeline/` `data/` `seed/`가 전부 실물로 서 있다.
파이프라인이 `buildings` 30,593행 · `units` 94,074행을 적재했고, API 10종(조회 9 + 쓰기 1)과
`docs/openapi.yaml`이 붙어 **화면이 실데이터로 돈다**. 남은 큰 구멍은 **점검 결과 저장(`POST /units/{unitId}/visits`)과 기록 조회(`/visits`)**,
그리고 **지도 실장**이다 — 아래 Known Gaps 참조.

## Source of Truth — 작업별 먼저 읽을 파일 `[DAULLIM]`

| 작업 | 먼저 읽어라 |
|---|---|
| 색·타이포·간격·라운드·컴포넌트 스펙 | `frontend/DESIGN.md` + `frontend/src/styles/tokens.css`(상단 3계층 주석) |
| 디자인 시스템 작업 규칙 | `frontend/DESIGN.md` § Iteration Guide, § Do's and Don'ts |
| 상태·처방·위험 등 도메인 열거값 | `frontend/src/config/domain.ts` |
| 스타일링 스택 결정 근거 | `docs/adr/ADR-011-styling.md` |
| 라우팅 | `frontend/src/App.tsx` |
| **API 계약** | `docs/openapi.yaml` (정본 — ADR-005). FE 타입은 그 손 사본인 `frontend/src/api/types.ts` |
| FE의 서버 호출 | `frontend/src/api/` — `client.ts`(봉투·토큰·401) · `queries.ts`(엔드포인트) · `use-api-query.ts`(조회 훅) |
| **DB 스키마·제약** | `backend/src/main/resources/db/migration/V1__init.sql` (테이블·CHECK·seed 전부 여기) |
| **판정·처방·큐 규칙** | `docs/adr/ADR-013-judgment-queue.md` → `backend/.../visit/service/JudgmentService.java` |
| **ERD 결정 이력** | `docs/adr/ADR-012-erd-v1.md` (v1.3까지 amend 누적) |
| 미해결·미합의 | `frontend/DESIGN.md` § Known Gaps (아래 Known Gaps 참조) |

기획서·기능명세서·PRD는 **리포 외부**(별도 볼트)에 있다 — 리포 안에 없는 경로를 가리키지 마라.

## Commands `[BASE 형식 / DAULLIM 값]`

`frontend/`에서:

```bash
npm run dev      # vite 개발 서버 (기본 5173, 사용 중이면 autoPort)
npm run build    # tsc -b && vite build  (타입체크 포함)
npm run lint     # oxlint
npm run preview  # 빌드 결과 미리보기
```

**FE를 띄우려면 BE도 떠 있어야 한다** — dev 서버가 `/api`를 `localhost:8080`으로 프록시한다.
프록시가 `Origin` 헤더를 떼므로 vite가 5173이 아닌 포트를 잡아도 CORS가 나지 않는다(`vite.config.ts`).
로그인해야 화면에 데이터가 뜬다 — 조회 API 전부가 토큰을 요구한다.

`backend/`에서 (Docker 필요 — Testcontainers):

```bash
docker compose up -d              # postgres 15
./gradlew spotlessApply build     # 포맷 + 타입체크 + 전체 테스트
./gradlew bootRun                 # 로컬 기동 (Swagger UI: /swagger-ui.html)
```

**검증 게이트 — 작업을 마치면 스스로 실행해 통과를 확인하고, 실패 시 고친 뒤 보고한다.**
FE는 `npm run lint` + `npm run build`, BE는 `./gradlew spotlessCheck build`.
`ui/` 벤더 파일의 `only-export-components` warning은 기존값 — **에러 0이면 통과**.

**`V1__init.sql`을 고쳤으면 DB를 새로 올려야 한다** — Flyway 체크섬이 불일치해 기동이 실패한다:

```bash
docker compose down -v && docker compose up -d
```

## Code Conventions `[혼합]`

대부분은 포인터를 따른다: 토큰·유틸리티 이름은 `tokens.css`/`DESIGN.md`, 린트는 `oxlint`. 아래는 **아직 어디에도 안 적힌 것만**:

- **`ui/` vs `core/` 경계** `[DAULLIM]` — `components/ui/`는 shadcn(Radix) 프리미티브(직접 수정 최소화), `components/core/`는 그 위의 도메인 래퍼. 프리미티브를 밑바닥부터 재구현하지 말고 래핑하라. `components/layout/`은 화면 골격 조각.
- **도메인 라벨 하드코딩 금지** `[DAULLIM]` — 상태·처방·위험 라벨/열거값을 화면에 직접 쓰지 말고 `config/domain.ts`에서 주입한다.
- **새 `text-*` 타이포 토큰 추가 시** `[DAULLIM]` — `src/lib/utils.ts`의 `extendTailwindMerge` `classGroups["font-size"]`에 반드시 등록한다. 안 하면 `cn()`이 그 토큰을 색상으로 오인해 같은 요소의 글자색 클래스를 지운다(과거 실제 발생).
- **파일 명명** `[DAULLIM]` — 컴포넌트·페이지 파일은 kebab-case(`queue-row.tsx`, `field-b1.tsx`). import 별칭은 `@/`.
- **브랜드 악센트 유틸리티는 `brand-*`** `[DAULLIM]` — `accent`는 shadcn 호버-틴트 슬롯이 선점(`DESIGN.md` Iteration Guide 8).

## Agent Behavior — 오버엔지니어링 억제 `[BASE]`

3주 MVP·1인 개발 맥락. 다음을 지킨다:

- **재사용 > 신규 생성.** 새 컴포넌트·추상화·유틸을 만들기 전에 `core/`·`ui/`·`lib/`에서 기존 것을 찾아 재사용·확장한다.
- **의존성 추가는 근거를 대고 먼저 묻는다.** 상태관리·차트·폼 라이브러리 등을 임의 설치하지 않는다. 새로 들일 땐 `docs/`에 ADR 한 줄로 근거를 남긴다. 지도는 **Naver Maps 확정**(ADR-004 v1.2, 아직 미실장), 서버 상태는 **직접 만든 훅 채택**(ADR-004 v1.4 — TanStack Query 미도입)이다.
- **FE 테스트 인프라를 임의로 세우지 않는다.** FE 검증은 `/demo` 페이지 + 수동 QA. 요청 없이 Jest/Vitest/Playwright를 깔지 않는다. BE는 JUnit + Testcontainers가 이미 서 있으니(ADR-009 배너) 로직을 고쳤으면 테스트도 같이 고친다.
- **요청 1개엔 요청 1개만.** 관련 개선이 보이면 코드에 몰래 넣지 말고 짧게 제안한다.
- **미합의·미정 사항을 지어내지 않는다**(아래 Known Gaps). 임의 결정 대신 사용자에게 확인한다.
- **주석·문서는 필요한 것만.** 코드가 말하는 걸 반복하지 말고, 기존 파일의 주석 밀도·톤에 맞춘다.
- **범위 밖 대규모 리팩터·파일 이동 금지.** 요청받지 않은 구조 변경을 하지 않는다.
- **조기 구조화 금지.** 지금은 루트 `CLAUDE.md` 하나로 충분하다. 분리가 필요해 보이면 제안만 하고 만들지 않는다.
- **스키마는 마이그레이션이 정본이다.** 엔티티에 컬럼을 추가하고 `V1__init.sql`을 잊으면 `ddl-auto=validate`가 기동을 막는다. 반대로 `validate`는 길이·nullable·CHECK·인덱스를 보지 않으니, 제약을 바꿨으면 테스트로 확인한다.
- **`domain.ts`를 고치면 Flyway seed도 같이 고친다.** `CodeLookupIT`가 둘의 일치를 지키지만, 대조는 사람이 시작해야 한다.

## Known Gaps `[DAULLIM]`

상세는 `frontend/DESIGN.md` § Known Gaps. 아래에 걸리면 **지어내지 말고 사용자에게 물어라**:

- **방문결과(`consent_cd`)의 화면 표시 모델 미합의** — 상태명·목록은 `config/domain.ts`에서만 관리(`StatusTag`는 톤 슬롯만 앎). 진행상태(`units.status_cd`) 축은 ADR-013으로 확정됐다.
- **점검 결과 저장 API 미구현** — `POST /units/{unitId}/visits`가 없어 점검 폼이 서버에 저장되지 않는다. 화면은 저장 결과를 로컬 상태로만 들고 있다(`field-b3.tsx`의 `visitOverrides`). 계약은 Notion "API 명세서 v2" §G-1에 있다.
- **점검 기록 조회 API 미구현** — `/records` 화면 전체가 `mock/records.ts`를 쓴다(`GET /visits`·`/visits/{id}` 대기).
- **`GET /auth/me` 미머지** — 상단바·드로어·설정의 사용자 정보가 `mock/sample.ts`의 `INSPECTOR`다(#23).
- **회원탈퇴가 서버에 반영되지 않는다** — `DELETE /auth/me`가 없어 이 기기의 세션만 끊는다.
- **지도 미실장** — Naver Maps로 확정됐으나(ADR-004 v1.2) `MapPlaceholder`가 그대로다. 착수 전 결정 2건이 남아 있다: **격자 위험 밀집 표시 방식**(현재 "옅은 실선 경계"까지만)과 **핀 렌더링 상한**(격자 하나에 최대 975건).
- **동 경계 GeoJSON 미확보** — 원본이 없어 지도 경계는 계속 플레이스홀더다. 격자 경계(1km)는 `GET /grids`로 확보돼 있다.
- **격자 구역 번호 발번 규칙 미정** — 화면은 1km 격자 코드(`다사4941`)를 그대로 식별자로 쓴다. 규칙이 서면 표시명을 붙인다.
