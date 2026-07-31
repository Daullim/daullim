# ADR-012 ERD v1 — 세대·교체 레이어 도입 (ADR-003 amend)

## 상태
제안 (2026-07-26, 제안자: 이윤서) — ADR-003을 **amend**. 상태 모델(ADR-003 §5)은 **여전히 보류**.
개정 v1.1 (2026-07-27, 결정자: 이윤서) — 계정 화면 3종(ADR-004 §1 v1.3) 반영: `users` 확장·회원탈퇴 soft-delete 확정.
개정 v1.2 (2026-07-28, 결정자: 이윤서) — **큐 런타임 모델 확정에 따른 구조 개정**: 발행 회차 폐지·
`building_queue_entries` 병합·lookup 축소·테이블 14→12. 결정 2와 결정 1·9의 일부를 **supersede**(v1.2 절 참조).
상태 모델 보류는 **그대로 유지**.

개정 v1.3 (2026-07-31, 결정자: 이윤서) — [ADR-013](ADR-013-judgment-queue.md)이 **amend**:
연차 추정 폐기(`age_bands`·`age_band_cd`·`is_age_estimated` 제거, `mfg_unmarked` 도입)로 **결정 7을 supersede**,
재방문 여부를 큐 결정 축으로 승격(결정 28~30). lookup이 실제로 6종이 되어 테이블 13→**12**(결정 24와 일치).
Flyway 파일은 `V2__erd_v1.sql`이 아니라 **`V1__init.sql`**로 작성됐다(적재 데이터 없어 V1 직접 수정).

전체 명세(테이블 6열 컬럼표·인덱스·제약·Mermaid ERD)는 볼트
`Output/contest/design/다울림-ERD-v1.md`가 정본. 이 ADR은 **결정과 근거만** 담는다.
(⚠️ 볼트 명세는 v1.1 기준 — v1.2 반영은 후속 항목)

## 맥락
ADR-003(2026-07-20) 이후 프론트엔드에서 두 축이 확정됐다.
1. **세대(호) 레이어 신설** — `frontend/src/lib/units.ts`. 점검·완료의 실제 단위가 건물이 아니라 세대이며,
   건물 완료는 전 세대 완료의 **파생값**(`isBuildingDone`)이다.
2. **점검 폼의 세대 단위 집계 재편** — `frontend/src/lib/inspection.ts`. 감지기 실별 반복이 사라지고,
   `roomCount`(분모) + `replacements[]`(교체가 필요한 건만 사유와 함께)로 바뀌었다.

ADR-003의 `visits.building_id`·`actuation` 단일 컬럼 모델은 이 구조를 담지 못한다.
또한 `building_queue`가 배치 재실행마다 재생성되는 테이블이라, 여기에 세대·점검 FK를 걸면
큐 리로드가 점검 이력을 깨뜨린다.

## 검토한 선택지
- **세대 레이어**: (a) `visits`에 `unit_label` 텍스트만 두고 건물 단위 유지 — 세대별 상태·이력·미완료 집계 불가로 기각.
  (b) **`units` 독립 테이블(채택)**.
- **큐 테이블**: (a) `building_queue` 단일 유지 + never-truncate UPSERT — 배치 산출물과 업무 데이터가 한 테이블에
  섞여 쓰기 주체 경계가 흐려짐. (b) **`buildings` + `building_queue_entries` 분해(채택)**.
- **파생 판정/처방**: (a) 매 조회 재계산 — 판정 규칙 변경 시 과거 방문 판정이 조용히 바뀜(NFR-04 위반)으로 기각.
  (b) **제출 시 스냅샷 + `rule_version` + 원입력 보존(채택)**.
- **열거값**: 네이티브 PG enum(ALTER TYPE 마찰 — 기각) / 전량 lookup 15종(3주 MVP 과잉 — 기각) /
  **속성 보유·미합의 코드만 lookup 7종 + 나머지 varchar+CHECK(채택)**.
- **외관 flags 다중선택**: `text[]`(배열 원소에 FK 불가 — 기각) / **조인 테이블(채택)**.

## 결정
1. ~~**핵심 테이블 7종**~~ (→ v1.2 결정 24: **12종 = 핵심 6 + lookup 6**): `users` / `buildings` /
   ~~`building_queue_entries`~~ / `units` / `visits` / `replacement_items` / `replacement_item_flags`.
   테이블명은 복수형 snake_case.
2. ~~**`building_queue` 분해.** `buildings`=안정 식별 + 건축물대장 프리필(UPSERT), `building_queue_entries`=
   `publish_round`별 스코어(`lambda_i`·`rr_i`·`score`·`order_key`·`is_explore`, 라운드 단위 재생성).~~
   **⚠️ v1.2 결정 18·19가 supersede** — 발행 회차 폐지로 분해 전제가 소멸, `buildings` 단일 테이블로 병합.
   **BE 읽기전용**(ADR-003 §3)은 유지.
3. **`visits.building_id` → `visits.unit_id`.** 점검 단위 이동. **ADR-005 `visit_result` 페이로드 변경을
   동반하므로 "계약 변경 PR" 필요**(미결정 §2).
4. **`visits.actuation`·`iot_recommended`·`revisit_reason` 제거.** 각각 `replacement_items.replace_reason_cd`,
   `replacement_items.rx_code_cd`, `consent_cd`+`refusal_reason_cd` 상속으로 대체.
5. **`visits.visit_status` 미채택.** ADR-003 §5의 5-state는 진행상태와 방문결과를 한 컬럼에 섞는다.
   진행상태 = `units.status_cd`, 방문결과 = `visits.consent_cd` 2축으로 분리. **§5 보류는 그대로 유지.**
6. **미발생(N/A) vs NULL은 `visits.is_inspected`로 판별.** false면 경보기·소화기 필드 전량 NULL을 CHECK로 강제.
   "점검했는데 없음"과 "점검 자체가 없음"이 구분된다.
7. ~~**실측·추정 분리.** `mfg_ym`(실측)과 `age_band_cd`(추정) 공존 금지 CHECK +
   `is_age_estimated` GENERATED STORED 컬럼.~~
   **⚠️ ADR-013 결정 26이 supersede** — 승낙하고 들어간 이상 제조년월은 실측 대상이고, 라벨을 못 읽는 것은
   추정할 상황이 아니라 연식을 보증할 수 없는 상황이다. `mfg_unmarked` boolean으로 대체.
   NFR-04 "(추정)" 표기는 건물 위험 점수 축에만 남는다.
8. **내용연수 경과 전량 교체는 행으로 물질화.** BE가 `room_count`만큼 `reason='expired'` 행을 생성하되
   `is_auto_generated=true`로 현장 입력과 구분. 집계 경로가 하나로 통일된다.
   (ADR-013 결정 27이 `unmarked`까지 확장 — 자동 생성은 이 두 사유뿐이다.)
9. **코드값은 `config/domain.ts` 키를 표기 변환 없이 저장.** kebab / UPPER_SNAKE / `RX-` 혼재를 그대로 수용하고,
   **신규 열거값만 kebab-case**로 통일. 코드 컬럼 접미사는 `_cd`.
10. **날짜 타입 정책.** 대장 유래값과 대장 규약을 그대로 쓰는 자체 기록일(`use_apr_day`·`last_inspected_day`)은
    `char(8)` YYYYMMDD 유지(FE `formatDay`/`todayDay`와 무변환 정합). 시각은 전부 `timestamptz`.
11. **상태 모델 미합의는 lookup 3컬럼에만 가둔다** — `unit_statuses.is_terminal`,
    `consent_statuses.is_inspectable`, `consent_statuses.unit_status_cd`(= `CONSENT_TO_UNIT_STATUS` 데이터화).
    합의되면 DDL 변경 없이 seed 행만 수정한다.
12. ADR-003 확정사항 **유지**: PostgreSQL 15+ / Flyway `V*__*.sql` / `ddl-auto=validate` /
    seed = `pipeline/load_seed.py` COPY / GeoJSON DB 미적재 / PostGIS 불요(공간 인덱스 없음).

### v1.1 추가 결정 (2026-07-27 — 계정 화면 반영)

13. **`users` 확장.** `/signup`이 수집하는 5개 필드에 맞춰 `phone` varchar(20)(`formatPhone()` 정규형 그대로),
    `birth_on` date를 추가. 직급·직위·소속은 **가입 폼에 없으므로 nullable 유지**하고 부여 경로는 미결정으로 남긴다.
14. **회원탈퇴 = soft-delete.** `is_active=false` + `withdrawn_at` 기록. 물리 삭제하지 않는다.
    `/settings` 확인 다이얼로그가 "계정과 점검 이력 **접근 권한**이 사라진다"이지 이력 삭제가 아니고,
    점검 이력은 서비스의 산출물이다. `visits.officer_id`의 **ON DELETE RESTRICT**가 이를 DB에서 강제하며,
    `withdrawn_at`은 비활성 사유가 탈퇴인지 전보·휴직인지를 구분한다(`CHECK: withdrawn_at IS NULL OR is_active = false`).
15. **사용자 설정은 DB에 두지 않는다.** 지도 유형(`MAP_TYPE`)은 `lib/prefs.ts`가 LocalStorage에만 저장하고
    서버로 보내지 않는다(ADR-004 v1.3). `domain.ts`에 열거값이 늘어도 **DB가 저장하지 않으면 스키마는 그대로**라는
    원칙의 첫 적용 사례 — 테이블도 lookup도 만들지 않았다.
16. **날짜 타입 정책을 3분류로 확장.** ①대장 유래·대장 규약 자체기록일 = `char(8)` YYYYMMDD /
    ②**대장 규약과 무관한 자체 수집 날짜 = `date`**(`birth_on` — 가입 폼이 이미 ISO를 준다) /
    ③시각 = `timestamptz`.
17. **인증은 여전히 미결정.** ADR-004 v1.3이 "로그인·회원가입은 전부 목업, 비밀번호는 어떤 형태로도 저장하지 않으며,
    실제 인증 계약은 BE 착수 시 ADR-005에 추가"로 명시했다. `users.password_hash`는 계속 자리만 확보한다.

### v1.2 추가 결정 (2026-07-28 — 큐 런타임 모델 확정·구조 축소)

> 계기: 큐의 실제 런타임 모델이 "배치가 회차 단위로 발행"이 아니라 **"현장 진입 시 조회로 생성,
> 점검 저장이 상태를 바꾸면 다음 조회에 반영"**으로 확정됐다. 회차 개념이 사라지면서
> 결정 2의 분해 전제가 소멸했고, 연쇄 정리로 테이블이 14→12로 줄었다.

18. **발행 회차(`publish_round`) 폐지.** 회차 경계가 정의 불가능(진입마다 발행인가?)하고,
    `UNIQUE(round, building)`·라운드 물리 교체·"오늘 명단" 사전 배정이 전부 성립하지 않는다.
    큐는 저장물이 아니라 **조회 시 파생**(`units.status_cd` LEFT JOIN) — 큐 갱신 API도 없다.
19. **`building_queue_entries` → `buildings` 병합.** 회차 폐지로 두 테이블이 같은 쓰기 주체(pipeline)·
    같은 갱신 주기(월 1회)·같은 방식(UPSERT)·1:1(PK=FK)이 되어 분해가 형식만 남았다.
    `buildings` = 대장 프리필 + 최신 점수(`score_version`·`computed_at` 포함). 33컬럼은 행 폭 ~450B로
    분리 정당화 조건(쓰기 주체·주기 상이, hot/cold, TOAST, 권한)에 하나도 해당하지 않는다.
20. **점수 이력은 `visits`가 보유.** 배차 스냅샷 3컬럼(`dispatched_score`·`dispatched_order_key`·
    `score_version`) 추가 — 월 UPSERT가 점수를 덮어써도 각 방문은 자기 배차 근거를 기억한다
    (`rule_version` 스냅샷 원칙의 배차측 대응). `visits.publish_round` 삭제,
    `route_order`는 **"실제 방문한 순서"**로 재정의. "officer 오늘 명단" = `visited_day` 사후 집계
    (`ix_visits_officer_day`). 사전 배정 명단이 필요해지면 별도 배정 테이블(미결).
21. **갱신 3계층 케이던스.** ③ 점수 재산출 = pipeline **월 1회**(원천 데이터 갱신 주기 정렬) /
    ② 연차 재산입 스캔 = **BE `@Scheduled` 일 1회**(`rx_baseline_day` 15년 재도래 → `pending` 복귀.
    `units`는 BE 소유라 BE가 쓴다 — pipeline이 쓰면 역방향 경계 침범) /
    ① 소진 상태 = 트리거 없음(조회 파생). **현장 종료 트리거는 기각** — 종료 시점에 점수를 바꿀
    새 정보가 없고, BE→pipeline 역방향 의존이 생긴다.
22. **`rx_codes` lookup 폐지 → varchar+CHECK 4곳.** 속성이 `label`뿐이라 결정 9의 자기 기준
    ("DB가 그 속성을 실제로 읽는가")을 스스로 통과하지 못한다. lookup은 7→**6종**.
    비용: RX 코드 추가 시 CHECK 4곳 동시 수정 — 2값 폐집합이라 수용, D5·D10 대조 목록에 "`RX-` grep" 추가.
23. **격자 단위 속성 DB 제외.** `zone_no`·`sgis_1km_id` 삭제 — 격자 속성의 정본은 GeoJSON properties다
    (ADR-003 §4). `detector_age_est`(`install_year` 중복 의심)·`nonapt_ratio`·`elderly_ratio`(격자 입도 의심)·
    `is_mixed`(소비처 불명)는 확인 전 제외 — 복원은 `ALTER ADD COLUMN` 1줄.
24. **테이블 12종 확정** — 핵심 6(`users`·`buildings`·`units`·`visits`·`replacement_items`·
    `replacement_item_flags`) + lookup 6(`replace_reasons`·`battery_types`·`detector_flags`·
    `condition_codes`·`unit_statuses`·`consent_statuses`). v1.1의 14종을 대체.
25. **`replace_reasons`에 `unmarked`(제조년월 미표기) 추가.** 형식승인 표시(제조년월) 부재는
    연차 축이 아니라 **사유 축**이다 — `age_band`에 넣으면 `unknown` 선택 시 전량 교체가 오히려
    비활성화되는 오분류가 생긴다. `rx=RX-IOT`, 판정 `DEFECTIVE`(연차를 논할 자격이 없는 건은
    EXPIRED가 아니다). FE(`domain.ts`·`inspection.ts`) 반영 완료 — 결정 9의 "domain.ts 변경 시
    Flyway seed 동반 수정" 규율의 첫 실행 사례. 라벨은 사실 기록("표시가 없었다")로 한정 —
    미인증 판정은 현장이 아니라 행정 레이어의 몫(기록 vs 결정 분리 원칙).

## 근거
- 세대 레이어를 1급 엔티티로 두면 단독주택도 "세대 1행"으로 통일되어 **주택유형 특수분기가 스키마에서 사라진다.**
  전유부 유무(다세대 有 / 다가구 無) 차이는 `ho_nm_source_cd` 한 컬럼으로만 나타난다.
- 스냅샷 결정의 핵심은 성능이 아니라 **정직성**이다. 판정 규칙은 이미 2회 바뀌었고(실별→세대 집계, 항목 최악값),
  재계산 모델이었다면 과거 방문 판정이 매번 다시 쓰였다. 서비스의 산출물이 "국내 최초 실작동률 데이터"인 이상
  이력 재현 가능성이 성능보다 우선한다.
- lookup을 7종으로 제한한 기준은 "**DB가 그 속성을 실제로 읽는가**(`is_severe`·`severity_rank`·`rx_code`)
  **또는 미합의 hotspot인가**". 라벨만 있는 코드는 `domain.ts`가 이미 정본이라 DB에 복제할 이유가 없다.

## 결과 (트레이드오프 수용)
- **ADR-005 API 계약 변경 발생** — `visit_result`의 `building_id` → `unit_id`, (v1.2) `publish_round` 제거·
  배차 스냅샷 3필드·신규 4종/폐기 6종 합산. 계약 변경 PR 1건 필요(초안 = Notion "API 명세서 v2").
- 테이블 수 3 → ~~14(핵심 7 + lookup 7)~~ **12(핵심 6 + lookup 6, v1.2)**. lookup은 2~5컬럼 seed 테이블이라
  운영 부담은 낮으나, Flyway seed 마이그레이션이 `domain.ts`와 드리프트할 수 있음 —
  **`domain.ts` 열거값 변경 시 Flyway 동반 수정을 규율로 통제**(통합 체크포인트 D5·D10에서 수동 대조,
  ADR-005 드리프트 통제와 동일 방식).
- `units.status_cd`·`last_inspected_day`는 최신 visit에서 유도 가능한 **비정규화 캐시**다.
  현장 태블릿의 세대 목록 조회와 배치 재산입 스캔이 이 두 값만 보므로 수용하되,
  visit INSERT와 동일 트랜잭션 갱신 + 야간 정합성 쿼리로 통제.
- `replacement_items` 개수 = `visits.effective_replace_count`, 외관 flags는 `reason='appearance'`에만 —
  다중 테이블 조건이라 CHECK로 못 걸고 **BE 서비스 계층 + 정합성 쿼리**에 의존.

## 후속
- **볼트 명세 `다울림-ERD-v1.md`를 v1.3으로 갱신** — 현재 v1.1 기준이라 병합·회차 폐지·lookup 축소·
  연차 추정 폐기·재방문 축이 모두 미반영.
- ~~`V2__erd_v1.sql`(Flyway) 작성 시~~ **`V1__init.sql`로 작성 완료**(2026-07-30). 스키마 변경은
  시연 데이터 적재 전까지 V1 직접 수정, 이후에는 V2 추가.
- 미결정은 볼트 명세 §10 기준으로 정리하되 v1.2로 **소멸 2건**(§10-6 회차 관리 테이블·§10-7 구 라운드 보존 —
  회차 개념 자체가 사라짐), **신규 1건**(`visits.client_visit_id` — 오프라인 동기화 멱등 키, UNIQUE.
  API 명세서 v2의 `Idempotency-Key`/`clientVisitId` 영속화 지점).
  그중 **착수 차단 항목은 §10-1(상태 모델)과 §10-2(API 계약)** 뿐이며,
  나머지 스키마는 착수 가능(ADR-003의 동일 규율 승계).
