# DEPLOY — 배포 운영 노트

배포 토폴로지 결정은 [ADR-006](adr/ADR-006-deploy.md). 현재 FE(Vercel)만 배포한다.

## FE — Vercel

| 항목 | 값 |
|---|---|
| Root Directory | `frontend` (모노레포 — 반드시 지정) |
| Framework Preset | Vite (자동 감지) |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| SPA rewrite | `frontend/vercel.json` — `BrowserRouter` 딥링크·새로고침 404 방지 |

- 빌드·출력 설정은 Vercel 자동 감지에 맡기고 `vercel.json`에 중복 기재하지 않는다.

## 배포 흐름

- `main` push → **production** 배포
- PR → **preview URL** 자동 생성 (팀원 리뷰용)

## 환경변수 (현재 0개)

실값은 리포에 커밋하지 않고 Vercel/Railway 환경변수에만 둔다 (ADR-006 시크릿 규칙).

| 키 | 위치 | 시점 |
|---|---|---|
| `VITE_API_BASE_URL` | Vercel | BE 연동 시 |
| `ALLOWED_ORIGIN` | Railway (BE) | BE 배포 시 — CORS |

## 시연 URL

- Production: https://daullim.vercel.app
