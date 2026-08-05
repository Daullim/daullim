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

## 환경변수

실값은 리포에 커밋하지 않고 Vercel/Railway 환경변수에만 둔다 (ADR-006 시크릿 규칙).

| 키 | 위치 | 필수 | 설명 |
|---|---|---|---|
| `VITE_API_BASE` | Vercel | BE 배포 시 | FE와 API의 오리진이 갈릴 때 절대주소. 비우면 상대경로 `/api/v1`로 호출한다 |
| `ALLOWED_ORIGIN` | Railway | BE 배포 시 | CORS 허용 오리진. **Vercel 도메인과 정확히 같아야 한다** — 틀리면 403 `Invalid CORS request` |
| `JWT_SECRET` | Railway | **예** | HS256 서명 키, **32바이트 이상**. prod 프로필에 기본값이 없어 없으면 기동이 실패한다 |
| `DB_URL`·`DB_USER`·`DB_PASSWORD` | Railway | **예** | Postgres 접속 정보 (`application-prod.yml`) |

- `VITE_API_TARGET`은 **개발 전용**이다(dev 서버가 `/api`를 넘길 백엔드 주소). 배포에는 쓰지 않는다.
- FE 키 이름은 `VITE_API_BASE`다 — `VITE_API_BASE_URL`이 아니다(`frontend/src/api/client.ts`).
- 배포 프로필은 Swagger UI를 끈다(`application-prod.yml`) — 배포 URL에서 `/swagger-ui.html`은 404다.

## DB 적재

BE만 올린다고 화면에 데이터가 뜨지 않는다. 파이프라인이 `buildings`·`units`를 적재해야 한다 —
절차는 [`../pipeline/README.md`](../pipeline/README.md) § 실행 순서. 적재 없이 뜨면 큐가 빈 목록이다.

## 시연 URL

- Production: https://daullim.vercel.app
