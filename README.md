<div align="center">
  <img src="frontend/public/daullim-logo.png" alt="다울림" width="180" />
  <h1>다울림 (Daullim)</h1>
  <p><b>주택 화재경보기 현장교체 우선순위 큐 산출 및 사후관리 시스템</b></p>
  <p>보급 여부가 확인되지 않으며 관리되지 않는 주택용 화재경보기</p>
</div>

---

주택용 소방시설(단독경보형 감지기)은 지자체·소방본부가 취약계층에 대량 보급했지만, **보급 이후의 사후관리는 대상 명부도 우선순위도 없이 이루어집니다.** 전지는 약 10년 뒤 방전되고, 기기는 탈거되거나 노후로 오작동하지만, 화재경보기 관련해서는 아무런 관리도 이루어지지 않습니다.

본 프로젝트는 **한정된 점검 인력이 방문할 순서를 복합 데이터로 결정하고, 현장에서의 판정·처방을 표준화**하기 위해 개발된 웹 애플리케이션입니다. 소방서 **예방담당자(관제)** 와 **현장 점검원(태블릿)** 을 대상으로, "위험한 집부터, 효율적인 동선으로, 같은 기준으로 판정한다"는 핵심 가치를 제공하는 것을 목표로 합니다.

<br/>

## 1. 개요 (Overview)

| 항목 | 내용                                                                                  |
|---|-------------------------------------------------------------------------------------|
| **서비스명** | 다울림 (Daullim)                                                                       |
| **최신 버전** | v1.0.0 (시연본)                                                                        |
| **배포 URL** | **https://daullim.vercel.app**                                                      |
| **API 서버** | https://daullim-production.up.railway.app               |
| **API 문서** | [`docs/openapi.yaml`](docs/openapi.yaml) (계약 정본) · 로컬 Swagger UI |
| **개발 기간** | 2026.07 ~ 2026.08 (약 3주)                                                            |
| **시연 대상 지역** | 서울 관악구·부산 부산진구(도시형) · 전북 임실군·부산 기장군(농촌형)            |
| **적재 데이터** | 건물 61,803행 · 세대 152,202행 (실데이터)                                                      |

### 두 개의 모드

| 모드 | 경로 | 사용자 | 기기                                       |
|---|---|---|------------------------------------------|
| **관제(Control)** | `/control` | 예방담당자 | 데스크톱 사이즈                                 |
| **현장(Field)** | `/field` | 현장 점검원 | 태블릿 1024×768 가로 — 장갑 조작 전제로 터치 타깃·대비를 키움 |

<br/>

## 2. 주요 기능 및 아키텍처 (Key Features & Architecture)

### 핵심 기능 (Key Features)

#### ① 우선순위 큐

배치 파이프라인이 세 항을 곱해 건물별 위험 점수를 산출합니다.

```
raw_score = λ̂ × (1 + αV⊥) × exp(Σβx)
             │        │            └ ③ 가구 상대위험 (노후·1인가구·구조 등)
             │        └ ② 잔차 지역 취약 (지역 지표 중 ①로 설명되지 않는 성분)
             └ ① 시공간 커널 화재 강도 (주거 화재 이력 + 경험적 베이즈 축소)
```

`ln(raw)`를 로버스트 min-max(q01~q99)로 0~100 정규화하고, 절대 임계값으로 **위험(≥70)·경고(≥35)·양호**를 부여합니다.

- **도농 이원 정렬** — 도시는 점수 캐스케이드로 랭킹하지만, **농촌은 절대 필터(비아파트·고령 비율)로 대상을 확정한 뒤 가구 속성으로 정렬**합니다.
- **동선 타이브레이커** — 동점 구간은 Morton(Z-order) 키로 정렬해 지리적으로 인접한 집이 연달아 나오게 합니다.
- **탐사 쿼터(7%)** — 큐 상위만 방문하면 회신 데이터가 자기 선택 편향에 갇히므로, 일부를 의도적으로 탐사 대상으로 표기합니다.

#### ② 판정·처방 서버 재계산

현장 폼은 **원입력(작동 여부·제조년월·상태 플래그 등)만 전송**하고, 판정(정상/경과/불량)·처방(`RX-BAT` 전지 교체 / `RX-IOT` 기기 교체)·실효 개수는 **서버가 다시 계산**합니다([`JudgmentService`](backend/src/main/java/com/daullim/backend/domain/visit/service/JudgmentService.java)). 클라이언트 버전에 따라 기준이 갈라지지 않습니다.

- **제조년월 미표기는 연차 축이 아니라 사유 축** — 라벨을 못 읽는 것은 연차를 추정할 상황이 아니라 연식을 보증할 수 없는 상황이므로 `EXPIRED`가 아닌 `DEFECTIVE`로 판정합니다.
- **재방문 필요 여부가 큐 잔류를 결정** — 승낙·거부·공가·연락두절 어느 결과든, 재방문이 필요하다고 기록한 방문은 세대를 큐에 붙잡아 둡니다.

#### ③ 현장 안정성

- **오프라인 보관 + 재전송** — 저장 실패 시 브라우저에 보관했다가 복구되면 자동 재전송합니다.
- **탈퇴 토큰 즉시 차단** — 액세스 토큰은 취소할 수 없으므로, 계정 생존을 요청마다 확인하는 필터가 전 경로에서 401을 반환합니다.

#### ④ 지도·현장 UX

- **Naver Maps** 위에 행정동 경계 GeoJSON(33개 행정동)을 그리고, **폴리곤 클릭 ↔ 동 선택이 양방향으로 연동**됩니다.
- 격자 위험도는 500m 격자로 저장하되 응답은 1km 격자로 유도해 내립니다(그대로 조인하면 0건).
- **네이버 지도 딥링크 길찾기**, 일자별 점검 기록 달력, 진행률 화면 등 현장 흐름(동 선택 → 격자 → 세대 → 점검 폼)을 4단계로 고정했습니다.

<br/>

## 3. 기술 스택 및 라이선스 (Tech Stack & License)

### 기술 스택 (Technologies Used)

| 영역 | 스택 |
|---|---|
| **Frontend** | React 19 · TypeScript 6 · Vite 8 · Tailwind CSS v4 · shadcn/ui(Radix) · React Router 7 · Naver Maps JS SDK |
| **Backend** | Java 21 · Spring Boot 4 (Web MVC · Data JPA · Security/OAuth2 Resource Server · Validation · Actuator) · springdoc-openapi |
| **Database** | PostgreSQL (로컬 15 / 운영 18.4) · Flyway 마이그레이션 |
| **Data Pipeline** | Python 3.13 · pandas · numpy · geopandas / pyogrio (EPSG:5179 좌표계) |
| **DevOps & Infra** | Vercel(FE) · Railway(BE·DB) · Docker / Docker Compose · GitHub Actions CI · Testcontainers |
| **Quality** | oxlint(FE) · Spotless + google-java-format(BE) · JUnit 5 + Testcontainers 통합테스트 20여 종 · pytest(pipeline) |

### 외부 API 및 라이브러리 (Dependencies)

**핵심 종속성**

- `org.springframework.boot:4.0.7` — 애플리케이션 프레임워크 (Java 21 toolchain)
- `org.flywaydb:flyway-database-postgresql`
- `org.springdoc:springdoc-openapi-starter-webmvc-ui:3.0.3` — Swagger UI
- `react@19`, `react-router-dom@7`, `tailwindcss@4`, `radix-ui@1` — 프론트엔드 코어
- `pretendard` — 한글 본문 서체

**외부 API / 공공데이터**

| 소스 | 용도 |
|---|---|
| 국토교통부 건축물대장(표제부·전유부) | 건물 마스터·세대 구성 |
| VWorld 지오코더 | 주소 → 좌표 (JSONL 캐시 경유) |
| 소방청 화재발생 정보 · 119 신고 격자 | 시공간 커널 λ̂ 산출 |
| 통계청 SGIS 격자 통계 · 경계 | 인구·가구·주택 지표, 격자 GeoJSON |
| 행정동 경계 GeoJSON | 지도 폴리곤 — 출처 [admdongkor](https://github.com/vuski/admdongkor) `ver20250701` |
| Naver Maps JS SDK | 지도 렌더링 |

### 라이선스 (License)

본 프로젝트는 **Apache License 2.0**을 따릅니다. 전문은 [`LICENSE`](LICENSE) 파일을 참조하십시오.

저작권 고지와 라이선스 사본을 유지하고 변경 사항을 명시하면 상업적 이용을 포함한 사용·수정·배포가 자유롭습니다. 기여자의 특허 라이선스가 명시적으로 부여되며, 소프트웨어는 어떠한 보증도 없이 "있는 그대로" 제공됩니다.

<br/>

## 4. 개발 및 빌드 환경 설정 (Getting Started)

### 필수 요구사항 (Prerequisites)

| 소프트웨어 | 버전 | 용도 |
|---|---|---|
| **Node.js** | >= 20.0.0 | 프론트엔드 |
| **npm** | >= 10.0.0 | 패키지 관리 |
| **JDK** | 21 | 백엔드 (Gradle toolchain이 자동 해석) |
| **Docker** | >= 20.10 | PostgreSQL 컨테이너 · Testcontainers 통합테스트 |
| **Python** | 3.13 (고정) | 데이터 파이프라인 — 3.14는 geopandas 휠 미비 |

### 실행 (Quick Start)

**1) 데이터베이스 + 백엔드**

```bash
docker compose up -d
```

```bash
cd backend && ./gradlew bootRun
```

```bash
psql "$DEMO_DB_URL" --single-transaction -v ON_ERROR_STOP=1 -f seed/demo-snapshot.sql
```

**2) 프론트엔드**

```bash
cd frontend && npm install && npm run dev
```


**3) 데이터 파이프라인 (선택 — seed를 직접 재생성할 때만)**

```bash
cd pipeline && python3.13 -m venv .venv && ./.venv/bin/pip install -r requirements.txt
```

실행 순서와 각 단계의 게이트 조건은 [`pipeline/README.md`](pipeline/README.md)를 참조하십시오. 최초 1회는 건물 마스터 수집에 1~2시간이 소요됩니다.


```bash
cd frontend && npm run lint && npm run build
```

```bash
cd backend && ./gradlew spotlessApply build
```

<br/>

## 5. 프로젝트 구조 (Project Structure)

```
.
├── frontend/                  # React SPA (Vercel 배포)
│   ├── src/
│   │   ├── api/               # 서버 호출 — client(봉투·토큰·401) · queries · use-api-query
│   │   ├── components/
│   │   │   ├── ui/            # shadcn(Radix) 프리미티브 — 직접 수정 최소화
│   │   │   ├── core/          # 그 위의 도메인 래퍼
│   │   │   ├── layout/        # 화면 골격 조각
│   │   │   ├── inspection/    # 현장 점검 폼
│   │   │   └── records/       # 점검 기록·달력
│   │   ├── config/domain.ts   # 상태·처방·위험 등 도메인 열거값 주입 지점 (라벨 하드코딩 금지)
│   │   ├── pages/             # control · field-b1~b3 · records · settings · login · demo
│   │   ├── styles/tokens.css  # 디자인 토큰 3계층
│   │   └── lib/               # cn() 등 유틸
│   ├── public/                # 로고 · 행정동 경계 GeoJSON 폴백
│   └── DESIGN.md              # 색·타이포·컴포넌트 스펙 + Known Gaps
│
├── backend/                   # Spring Boot API (Railway 배포)
│   ├── src/main/java/com/daullim/backend/
│   │   ├── common/            # response(응답 봉투) · security(JWT) · error · config
│   │   └── domain/            # region · building · unit · visit · grid · dashboard · user · code
│   │       └── <도메인>/       # controller · service · repository · entity · dto
│   ├── src/main/resources/db/migration/
│   │   └── V1__init.sql       # 스키마 정본 — 테이블·CHECK·lookup seed 전부 여기
│   ├── src/test/              # JUnit + Testcontainers 통합테스트 (*IT.java)
│   └── Dockerfile
│
├── pipeline/                  # Python 배치 추론 (오프라인)
│   ├── daullim_data/          # utils(데이터 함정 9종) · regions · ingest · region_type
│   │                          # kernel(λ̂) · vulnerability · scoring · seed_out · ltr
│   ├── run_*.py               # 9단계 실행 스크립트 (앞 단계 산출을 뒤가 사용)
│   ├── load_seed.py           # DB 적재
│   └── tests/                 # pytest
│
├── seed/                      # 동결된 산출물
│   ├── buildings.csv · units.csv
│   ├── grids.geojson · admin-dong-boundaries.geojson · regions.csv
│   ├── demo-snapshot.sql      # pg_dump --data-only (약 19MB)
│   └── score_params.json      # 점수 재현 파라미터
│
├── data/                      # 원본 공공데이터 배치 (화재·119신고·SGIS·건축물대장 캐시)
│
├── docs/
│   ├── openapi.yaml           # API 계약 정본 — 변경은 "계약 변경 PR"로만
│   ├── DEPLOY.md              # 배포·CI·환경변수 운영 노트
│   └── adr/                   # ADR-001~015 — 모든 기술 결정의 근거와 이력
│
├── .github/workflows/         # CI — backend.yml · frontend.yml
└── CLAUDE.md                  # 저장소 작업 규칙 (진실원본 포인터 모음)
```
<br/>

## 6. 담당자 및 문의처 (Contact & Maintainers)

- **개발 총괄**: 이윤서 — lys8167@gmail.com
- **기타 문의**: 본 저장소의 **GitHub Issues** 탭을 이용.

<br/>

---

<div align="center">
  <sub><b>다울림</b> — 소방 점검원과 화재예방 담당자를 위한 업무 도구.</sub>
</div>
