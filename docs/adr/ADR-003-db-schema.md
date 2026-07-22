# ADR-003 DB·마이그레이션·seed 적재·스키마

## 상태
승인 (2026-07-20, 결정자: 이윤서) — 단 §5 상태 모델은 **보류** (박지현과 합의 후 확정)

## 맥락
- BE = Spring Boot + Java (ADR-002). 핵심 데모 M-12 = 회신이 DB에 쌓여 관제에 반영되는 피드백 루프 — 재배포·재시작에도 데이터 생존 필요.
- 지도는 사전 생성 정적 GeoJSON(PRD v2 대안④), PostGIS 불요.
- 도시형-변별력-최종안 §7-2: `household_queue` → `building_queue` 개칭 및 `lambda_i`·`rr_i`·`score`·`order_key`·`explore_flag` 컬럼 요구 (Step 1 충돌 1·2).
- 기능명세서(2026-07-19)와 PRD v2의 방문 상태값 체계 불일치 (Step 1 충돌 4).

## 검토한 선택지
- DB: **PostgreSQL(채택)** / SQLite(Spring dialect 마찰·볼륨 유실 리스크) / H2(재시작 소실 — 데모 상극)
- 마이그레이션: **Flyway SQL(채택)** / JPA ddl-auto(비결정적 — 기각) / Liquibase(과잉)
- seed 적재: **pipeline Python COPY 스크립트(채택)** / BE ApplicationRunner(검증 유틸 중복 구현) / 수동 psql(재현성 낮음)

## 결정
1. **PostgreSQL 15+ 단일 인스턴스.** 로컬 = Docker Compose, 배포 = Railway 관리형(상세 D6/ADR-006).
2. **Flyway** — `V1__init.sql` 방식, JPA `ddl-auto=validate`로 잠금.
3. **seed 적재 = `pipeline/load_seed.py`의 COPY.** D8 검증 유틸을 통과한 데이터만 적재. BE는 building_queue 읽기 전용.
4. **GeoJSON은 DB 미적재** — `seed/*.geojson`을 BE가 정적 서빙(`GET /grids` + Cache-Control). 격자 속성은 GeoJSON properties에 내장, `grid_score` 테이블 없음.
5. **테이블 3개**: `users` / `building_queue` / `visits`.
   - `building_queue` (개칭 확정): building_id PK, grid_id, sgis_1km_id, sido/sigungu/admin_dong, address, lat/lng(EPSG:4326), region_type(URBAN|RURAL|BUFFER|NO_POP), mixed_flag, lambda_i, rr_i, score, order_key, **explore_flag**(G2 탐사 쿼터 — 충돌 2 해소), estimation_flag, rx_code, detector_model, detector_age_est(seed 더미 허용), nonapt_ratio, elderly_ratio
   - `visits`: id, building_id FK, publish_round, officer_id, route_order, visit_status(§5 보류), consent_status, actuation, rx_done, iot_recommended, revisit_reason, gps_lat/lng, reported_at, created_at
   - `visit_result` 페이로드: `household_id` → `building_id` 개칭 (충돌 1 해소)

## §5 상태 모델 (보류 중인 제안안)
`visit_status`로 기능명세서를 정본화, PRD `consent_status` 병존:
PENDING(대기) / IN_PROGRESS(방문 중) / ABSENT(부재) / NEED_REVISIT(재방문 필요+사유 필수) / DONE(완료, 조치완료=DONE+rx_done=true).
→ **박지현과 합의 후 확정.** 확정 전까지 `POST /visits/{id}` 구현 착수 금지(계약 변동 지점), 나머지 스키마는 착수 가능.

## 근거
- Spring 1급 지원 + 관리형 배포 + 시연 데이터 생존 + 실무 표준 포트폴리오 서사.
- 검증-적재를 pipeline 한 곳에 두어 "검증 통과 데이터만 DB 진입" 보장.

## 결과 (트레이드오프 수용)
- 로컬 개발에 Docker 의존 추가 — 수용.
- GeoJSON-DB 이원화로 seed 재생성 시 파일·테이블 동시 갱신 필요 → pipeline이 원자적으로 함께 산출하는 것으로 통제(D8 규약에 포함).
- 상태 모델 보류로 D8(WBS상 회신 API 구현일) 전 팀 합의 데드라인 발생.
