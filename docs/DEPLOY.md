# DEPLOY — 배포 운영 노트

배포 토폴로지 결정은 [ADR-006](adr/ADR-006-deploy.md). **FE(Vercel) · BE·DB(Railway)가 모두 배포돼 있다.**

| | URL |
|---|---|
| 시연 URL (FE) | https://daullim.vercel.app |
| BE | https://daullim-production.up.railway.app |
| 헬스체크 | https://daullim-production.up.railway.app/actuator/health |

BE 주소는 시연에 노출하지 않는다 — 화면은 Vercel 도메인 하나로 돈다.

## CI — GitHub Actions

| 워크플로 | 체크 이름 | 하는 일 |
|---|---|---|
| `.github/workflows/backend.yml` | `backend` | `./gradlew spotlessCheck build` (Testcontainers는 러너 내장 Docker) |
| `.github/workflows/frontend.yml` | `frontend` | `npm ci && npm run lint && npm run build` |

- 트리거는 `main` push와 모든 PR. **`main` push는 경로 필터 없이 전부 돈다** — Railway가 그 커밋을 배포하므로 main은 항상 검증돼 있어야 한다.
- PR은 잡 첫 스텝이 `git diff`로 변경 경로를 보고 무거운 단계를 건너뛴다(FE 전용 PR에서 BE 잡은 ~20초에 초록).
  **워크플로 수준 `paths:`를 쓰지 않는 이유**: 경로 필터로 스킵된 워크플로의 체크는 pending에 머물러, 브랜치 보호의 필수 체크로 걸면 반대쪽만 고친 PR이 영원히 머지되지 않는다.
- Gradle 캐시는 **기본 브랜치에서만 기록된다**(`gradle/actions/setup-gradle`의 기본 동작). PR 브랜치는 읽기만 한다.
- **브랜치 보호는 아직 켜지 않았다.** 켤 때 필수 체크로 지정할 이름은 위 표의 `backend`·`frontend`이며, 그 이름은 워크플로가 한 번 실행된 뒤에야 목록에 뜬다.

## FE — Vercel

| 항목 | 값 |
|---|---|
| Root Directory | `frontend` (모노레포 — 반드시 지정) |
| Framework Preset | Vite (자동 감지) |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| SPA rewrite | `frontend/vercel.json` — `BrowserRouter` 딥링크·새로고침 404 방지 |

- 빌드·출력 설정은 Vercel 자동 감지에 맡기고 `vercel.json`에 중복 기재하지 않는다.
- `main` push → **production** 배포 / PR → **preview URL** 자동 생성.
- preview 도메인 형식은 `daullim-<해시>-xyunals-projects.vercel.app`, 브랜치 별칭은 `daullim-git-<브랜치>-xyunals-projects.vercel.app`이다.

## BE — Railway

| 항목 | 값 |
|---|---|
| Root Directory | `backend` (필수) |
| Builder | Dockerfile (`backend/Dockerfile`) |
| 배포 트리거 | Railway 네이티브 GitHub 연동 — `main` 감시 |
| Watch Paths | `/backend/**` (FE 전용 변경으로 재배포되지 않게) |
| Health Check Path | `/actuator/health` |
| Target Port | 8080 |
| DB | 같은 프로젝트의 Railway 관리형 Postgres (18.4) |

**리포에 연결된 Railway 프로젝트는 하나여야 한다.** 둘이 같은 리포를 보면 push마다 양쪽이 빌드해 요금이 두 배가 되고, 어느 쪽에 배포됐는지 추적이 안 된다(실제로 한 번 겪었다).

## 환경변수

실값은 리포에 커밋하지 않고 Vercel/Railway 환경변수에만 둔다 (ADR-006 시크릿 규칙).

| 키 | 위치 | 필수 | 설명 |
|---|---|---|---|
| `VITE_API_BASE` | Vercel | **예** | **`/api/v1`까지 포함한 절대주소**. `client.ts`가 경로 전체를 대체하므로 오리진만 넣으면 전 호출이 404다. 값: `https://daullim-production.up.railway.app/api/v1` |
| `VITE_NAVER_MAP_CLIENT_ID` | Vercel | **예** | 네이버 지도 SDK 키. 없으면 빌드가 SDK 로드 분기를 통째로 제거해 지도 자리에 "지도 키가 설정되지 않았습니다"가 뜬다 |
| `ALLOWED_ORIGIN` | Railway | **예** | CORS 허용 오리진. 쉼표 구분 목록이며 **패턴을 쓸 수 있다**. 값: `https://daullim.vercel.app,https://daullim-*-xyunals-projects.vercel.app` |
| `JWT_SECRET` | Railway | **예** | HS256 서명 키, UTF-8 기준 **32바이트 이상**. prod 프로필에 기본값이 없어 없으면 기동 실패. `openssl rand -base64 48` |
| `DB_URL` | Railway | **예** | **JDBC 형식이어야 한다.** `jdbc:postgresql://${{Postgres.PGHOST}}:${{Postgres.PGPORT}}/${{Postgres.PGDATABASE}}` |
| `DB_USER`·`DB_PASSWORD` | Railway | **예** | `${{Postgres.PGUSER}}` · `${{Postgres.PGPASSWORD}}` |

- `SPRING_PROFILES_ACTIVE`는 넣지 않는다 — `Dockerfile`이 `prod`로 박아 둔다.
- `VITE_API_TARGET`은 **개발 전용**이다(dev 서버가 `/api`를 넘길 백엔드 주소). 배포에는 쓰지 않는다.
- FE 키 이름은 `VITE_API_BASE`다 — `VITE_API_BASE_URL`이 아니다(`frontend/src/api/client.ts`).
- **Vite 환경변수는 빌드 타임에 박힌다.** Vercel에서 값을 바꿨으면 반드시 Redeploy 해야 반영된다. Production·Preview 환경 양쪽에 체크한다.
- 네이버 클라우드 콘솔의 **Web 서비스 URL에 `https://daullim.vercel.app`을 등록**해야 지도가 인증된다. preview 도메인은 배포마다 바뀌어 등록할 수 없으므로 **preview에서 지도가 안 뜨는 것은 정상**이다(API는 돈다).

## DB 적재 — 스냅샷 (ADR-006 §3)

**Flyway는 테이블 12개(+ 자기 이력 테이블)와 lookup seed만 만든다.** `buildings` 94,240행 · `units` 243,846행은 따로 넣어야 한다.
파이프라인을 운영 DB에 직접 돌리지 않고 **스냅샷을 복원**한다 — seed 동결 결정에 따른 것이다.

| 파일 | 내용 |
|---|---|
| `seed/demo-snapshot.sql.gz` | `pg_dump --data-only`를 gzip한 것. `buildings`·`units` COPY 2블록 + 시퀀스 `setval` 2줄. `address_norm`은 GENERATED라 제외된다 |
| `seed/reset-demo.sh` | 업무 데이터를 비우고 스냅샷을 재적재. `users`·lookup 6종은 **보존**한다 |

현재 스냅샷은 **6지역 · buildings 94,240 · units 243,846** (2026-08-13 재생성).

**gzip으로 둔다 — 압축 전 54.7MB는 GitHub 경고선(50MB)을 넘었다.** SQL 텍스트라 9.2배가
줄어(→ 5.7MB) 여유가 생겼다. 압축 전에는 지역당 ~9MB씩 늘어 **네 곳만 더하면 차단선(100MB)**에
닿는 상태였다. 압축 해제본이 원본과 바이트 단위로 같음을 확인했다.

접속 URL은 Railway → Postgres 서비스 → Variables의 **`DATABASE_PUBLIC_URL`**이다(내부용 `DATABASE_URL`이 아니다).

```bash
# 최초 적재 (빈 DB에 데이터만 얹는다)
gunzip -c seed/demo-snapshot.sql.gz | psql "$DEMO_DB_URL" --single-transaction -v ON_ERROR_STOP=1 -f -

# 리허설·본시연 초기화
DEMO_DB_URL='postgresql://...' ./seed/reset-demo.sh
```

로컬에 `psql`이 없으면 스크립트가 docker의 postgres 컨테이너를 경유한다(`PG_CONTAINER`로 이름 변경).
실측: 복원 19초, 리셋 18.7초. 리셋 후에도 `users`와 lookup이 남고 큐 API가 리셋 전과 동일한 첫 행을 낸다.

**스냅샷을 다시 뜰 때** — 로컬 DB가 정본이다:

```bash
# ① 업무 상태를 출발점으로 되돌린다 (아래 ⚠️ 참조)
docker compose exec -T postgres psql -U daullim -d daullim -c \
  "UPDATE units SET status_cd='pending', last_inspected_day=NULL, rx_baseline_day=NULL WHERE status_cd <> 'pending';"

# ② 덤프
docker exec backend-postgres-1 pg_dump -U daullim -d daullim \
  --data-only --no-owner --no-privileges -t public.buildings -t public.units \
  | gzip -9 > seed/demo-snapshot.sql.gz
```

> ⚠️ **덤프 전에 `units`의 업무 상태를 비워야 한다 — 안 그러면 리셋 후 앞뒤가 안 맞는다.**
> 스냅샷은 `buildings`·`units`만 담는데 `reset-demo.sh`는 **`visits`까지 TRUNCATE**한다.
> 로컬에서 현장 폼을 테스트하면 `units.status_cd`가 `done`·`refused`로 남는데, 그대로 덤프하면
> **"점검 기록 0건인데 세대는 점검 완료"** 상태로 시연이 시작된다(`/records`는 비어 있고
> 큐에서는 그 세대가 처리된 것으로 보임). 2026-08-11 재생성 때 실제로 2행이 이렇게 섞여 들어갔다.
> 확인은 덤프 후 이 한 줄로 한다 — `pending` 하나만 나와야 한다:
>
> ```bash
> gunzip -c seed/demo-snapshot.sql.gz | grep -c $'\tpending\t'   # units 행수와 같아야 한다
> ```

덤프 후 **행수·구조를 확인**한다. `COPY` 2블록 + `setval` 2줄이 아니면 대상 테이블이 바뀐 것이다:

```bash
gunzip -c seed/demo-snapshot.sql.gz | grep -c "^COPY public\."             # 2
gunzip -c seed/demo-snapshot.sql.gz | grep -c "^SELECT pg_catalog.setval"  # 2
```

## 시연 당일 절차

**아침 1분 점검** (ADR-006 운영 4):

```bash
curl -s https://daullim-production.up.railway.app/actuator/health   # {"status":"UP"}
curl -s -o /dev/null -w '%{http_code}\n' https://daullim.vercel.app # 200
```

그다음 브라우저로 로그인 → `/control` 큐에 행이 뜨는지 → 지도 타일·핀이 뜨는지까지 눈으로 본다.
직전 리허설에서 점검 결과를 저장했다면 `./seed/reset-demo.sh`로 초기화한다.

**롤백**

- FE: Vercel → Deployments → 직전 production 배포의 `Promote to Production`. 빌드 없이 즉시 되돌아간다.
- BE: Railway → Deployments → 직전 성공 배포의 `Redeploy`. **`Redeploy`는 같은 커밋을 다시 배포한다** — 새 커밋을 올리려는 목적이면 `Deploy latest commit`을 써야 한다(둘을 혼동하면 "배포했는데 코드가 안 바뀌는" 증상이 난다).
- DB: 스냅샷이 정본이므로 `reset-demo.sh`가 곧 롤백이다.

**Railway 장애 시 백업안** — BE·DB가 함께 죽으면 FE만으로는 화면이 빈다. 로컬에서 `docker compose up -d` + `./gradlew bootRun`으로 BE를 띄우고, FE를 `npm run dev`로 로컬 구동해 시연한다(dev 서버가 `/api`를 로컬 8080으로 프록시하므로 환경변수 수정이 필요 없다). 이 경로를 리허설에서 한 번 밟아 둔다.

## 실제로 밟은 함정

- **`DB_URL`에 Railway의 `DATABASE_URL`을 그대로 넣으면 기동 실패.** 그건 `postgresql://` 형식이고 Spring은 JDBC URL을 요구한다.
- **`${{...}}` 참조에 닫는 중괄호를 더 치면 호스트에 `}}`가 붙는다.** 증상은 `UnknownHostException: postgres.railway.internal}}`. 자동완성이 닫는 괄호까지 넣어 준다.
- **`/swagger-ui.html`과 `/v3/api-docs`는 배포에서 404가 정상이다**(`application-prod.yml`이 springdoc을 끈다).
- **필수 쿼리 파라미터를 빼면 400이 아니라 500이 온다** — 계약 위반이며 별건으로 남아 있다(`GET /regions/sigungus`에 `sidoCd` 누락 시 재현).
- `docs/openapi.yaml`에 **`/auth/login`·`/auth/signup`·`/auth/me` 경로가 없다.** 컨트롤러에는 실재한다.
