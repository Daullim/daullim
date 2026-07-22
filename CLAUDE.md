# CLAUDE.md

> 이 파일은 얇은 하네스다. 상세 규칙은 복붙하지 않고 진실원본을 가리킨다.
> 태그: `[BASE]` = 다른 프로젝트에도 재사용 가능한 범용 규칙 / `[DAULLIM]` = 이 서비스 전용.

## Project Overview `[DAULLIM]`

다울림 — 소방 취약가구 화재경보기 사후관리 **우선순위 처방 도구**(소방안전 빅데이터 경진대회 출품, 3주 MVP, 1인 개발). 주 사용자는 소방 점검원·예방담당자. 두 모드: `/control` 관제(데스크톱)·`/field` 현장(**태블릿 1024×768 가로 우선, 장갑 조작·명료함**).
현재 스코프는 **frontend-first**. `backend/` `pipeline/` `data/` `seed/`는 아직 비어 있다 — 지어내 채우지 말 것.

## Source of Truth — 작업별 먼저 읽을 파일 `[DAULLIM]`

| 작업 | 먼저 읽어라 |
|---|---|
| 색·타이포·간격·라운드·컴포넌트 스펙 | `frontend/DESIGN.md` + `frontend/src/styles/tokens.css`(상단 3계층 주석) |
| 디자인 시스템 작업 규칙 | `frontend/DESIGN.md` § Iteration Guide, § Do's and Don'ts |
| 상태·처방·위험 등 도메인 열거값 | `frontend/src/config/domain.ts` |
| 스타일링 스택 결정 근거 | `docs/ADR-011-styling.md` |
| 라우팅 | `frontend/src/App.tsx` |
| 미해결·미합의 | `frontend/DESIGN.md` § Known Gaps (아래 Known Gaps 참조) |

기획서·기능명세서·PRD는 **리포 외부**(별도 볼트)에 있다 — 리포 안에 없는 경로를 가리키지 마라.

## Commands `[BASE 형식 / DAULLIM 값]`

작업 디렉토리는 `frontend/`. `package.json`과 정확히 일치:

```bash
npm run dev      # vite 개발 서버 (기본 5173, 사용 중이면 autoPort)
npm run build    # tsc -b && vite build  (타입체크 포함)
npm run lint     # oxlint
npm run preview  # 빌드 결과 미리보기
```

**검증 게이트 — 작업을 마치면 스스로 `npm run lint`와 `npm run build`를 실행해 통과를 확인하고, 실패 시 고친 뒤 보고한다.** (build가 타입체크를 포함한다. `ui/` 벤더 파일의 `only-export-components` warning 2건은 기존값 — 에러 0이면 통과.)

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
- **의존성 추가는 근거를 대고 먼저 묻는다.** 상태관리·차트·폼 라이브러리 등을 임의 설치하지 않는다. 미도입 제안 상태인 것(지도=react-leaflet, 서버상태=TanStack Query)을 도입할 땐 `docs/`에 ADR 한 줄로 근거를 남긴다.
- **테스트 인프라를 임의로 세우지 않는다.** 검증은 `/demo` 페이지 + 수동 QA. 요청 없이 Jest/Vitest/Playwright를 깔지 않는다.
- **요청 1개엔 요청 1개만.** 관련 개선이 보이면 코드에 몰래 넣지 말고 짧게 제안한다.
- **미합의·미정 사항을 지어내지 않는다**(아래 Known Gaps). 임의 결정 대신 사용자에게 확인한다.
- **주석·문서는 필요한 것만.** 코드가 말하는 걸 반복하지 말고, 기존 파일의 주석 밀도·톤에 맞춘다.
- **범위 밖 대규모 리팩터·파일 이동 금지.** 요청받지 않은 구조 변경을 하지 않는다.
- **조기 구조화 금지.** 지금은 루트 `CLAUDE.md` 하나로 충분하다. `backend/`가 실제로 자라기 전엔 `frontend/CLAUDE.md` 분리를 제안만 하고 만들지 않는다.

## Known Gaps `[DAULLIM]`

상세는 `frontend/DESIGN.md` § Known Gaps. 아래에 걸리면 **지어내지 말고 사용자에게 물어라**:

- **방문/점검 상태 모델 미합의** — 상태명·목록은 `config/domain.ts`에서만 관리(`StatusTag`는 톤 슬롯만 앎).
- **도시 격자 위험 밀집 표시 방식 결정 대기** — 격자는 "옅은 실선 경계"까지만.
- **동 경계 GeoJSON 미확보** — 지도 경계는 플레이스홀더.
