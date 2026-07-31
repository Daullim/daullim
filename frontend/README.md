# frontend — 다울림 웹 클라이언트

React + Vite + TypeScript + Tailwind CSS v4 + shadcn/ui(Radix).
두 모드: `/control` 관제(데스크톱) · `/field` 현장(**태블릿 1024×768 가로 우선, 장갑 조작·명료함**).

## 명령

```bash
npm run dev      # vite 개발 서버 (기본 5173, 사용 중이면 autoPort)
npm run build    # tsc -b && vite build  (타입체크 포함)
npm run lint     # oxlint
npm run preview  # 빌드 결과 미리보기
```

자동 테스트는 두지 않는다(ADR-009). 검증은 `/demo` 페이지 + 수동 QA.
`ui/` 벤더 파일의 `only-export-components` warning은 기존값 — **에러 0이면 통과**.

## 먼저 읽을 것

| 작업 | 진실원본 |
|---|---|
| 색·타이포·간격·컴포넌트 스펙 | [`DESIGN.md`](DESIGN.md) + `src/styles/tokens.css` |
| 도메인 열거값(상태·처방·판정·위험) | `src/config/domain.ts` — **화면에 라벨을 하드코딩하지 않는다** |
| 판정·처방 규칙 | `src/lib/inspection.ts` (서버가 정본 — `backend/.../JudgmentService.java`) |
| 라우팅 | `src/App.tsx` |
| 스타일링 스택 근거 | [`../docs/adr/ADR-011-styling.md`](../docs/adr/ADR-011-styling.md) |
| 미해결·미합의 | [`DESIGN.md`](DESIGN.md) § Known Gaps |

## 디렉터리

```
src/
├─ components/ui/         # shadcn(Radix) 프리미티브 — 직접 수정 최소화
├─ components/core/       # 그 위의 도메인 래퍼 (QueueRow·StatusTag·RiskBadge …)
├─ components/layout/     # 화면 골격 조각 (TopBar·Drawer·Legend)
├─ components/inspection/ # 점검 폼 위저드의 단계별 섹션
├─ components/records/    # 점검 기록 표 — 폼의 세대 방문 이력과 공용
├─ config/domain.ts       # 도메인 열거값 주입 지점
├─ lib/                   # 순수 함수 (inspection·units·prefs·utils)
├─ mock/                  # 시연용 고정 데이터 — BE 연동 시 교체 지점
└─ pages/                 # 라우트 단위 화면
```

## 주의

- **Tailwind 컨테이너 스케일 금지**(`max-w-2xl` 등). `tokens.css`의 `--spacing-2xl`이 가려서
  폭이 32px로 무너진다. 숫자 스케일(`max-w-160` = N×4px)만 쓴다.
- **새 `text-*` 타이포 토큰을 추가하면** `src/lib/utils.ts`의 `extendTailwindMerge`
  `classGroups["font-size"]`에 반드시 등록한다. 안 하면 `cn()`이 색상으로 오인해
  같은 요소의 글자색 클래스를 지운다.
- 브랜드 악센트 유틸리티는 `brand-*`. `accent`는 shadcn 호버-틴트 슬롯이 선점하고 있다.
- 파일명은 kebab-case, import 별칭은 `@/`.

## 배포

Vercel(Root Directory = `frontend`). 상세는 [`../docs/DEPLOY.md`](../docs/DEPLOY.md).
