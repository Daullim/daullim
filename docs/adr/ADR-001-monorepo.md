# ADR-001 리포지토리 전략 — 모노레포

## 상태
승인 (2026-07-20, 결정자: 이윤서)

## 맥락
- 코드 자산 3덩어리: BE(API 서버), FE(React+Vite), seed 파이프라인(Python — PoC 자산 이관).
- 데이터 자산 2종: 원본(플랫폼 격자 데이터 수 GB — repo 포함 금지), seed 산출물(CSV·GeoJSON, MB급 — 시연 재현에 필수).
- 2인(BE 1·FE 1) 3주. D15 공개 URL E2E 시연이 유일한 성공 조건. 1주차 API 계약 고정 후 병렬 개발 필수.
- 시스템의 핵심 계약: seed 산출물 = API 서빙 데이터 = FE 렌더 GeoJSON의 단일 정합.

## 검토한 선택지
1. **모노레포** (BE+FE+pipeline 한 repo) — 계약·이슈·PR 단일화, CI 경로 필터만 필요.
2. 2-repo (앱 / 파이프라인 분리) — 파이프라인을 별도 포트폴리오 피스로 분리 가능하나 seed 이관 절차에서 버전 불일치 사고 가능.
3. 3-repo (BE/FE/pipeline) — 계약 변경 시 3곳 동기화, 2인에겐 순수 오버헤드. 계약 드리프트 위험 최대.

## 결정
**모노레포 채택.** repo 이름 = **`daullim`** (2026-07-22 확정 — 서비스명 '다울림'의 로마자 표기법 표기. 실무 관례상 서비스명 그대로, mvp/monorepo 접미사 배제). 디렉터리 골격:

```
daullim/
├─ backend/          # BE (스택은 ADR-002)
├─ frontend/         # React + Vite
├─ pipeline/         # Python seed 스크립트 (PoC 자산 이관)
├─ data/             # .gitignore 전체 — 원본 로컬 전용, README.md로 출처·경로 규약만 커밋
├─ seed/             # 파이프라인 산출물(CSV·GeoJSON) — 커밋 대상
└─ docs/             # API 계약, ADR 등
```

경로 규약:
- `data/` 원본은 커밋 금지. `data/README.md`에 다운로드 출처(플랫폼 상품 ID)·배치 경로를 명문화.
- `seed/` 산출물은 커밋 — clone만으로 FE 온보딩·시연 재현 가능해야 함.
- 산출물이 50MB를 넘으면 Git LFS 또는 GitHub Release 첨부로 전환.

## 근거
1. seed→API→FE의 단일 계약이 repo 경계를 넘지 않아 3주 최대 리스크(계약 드리프트) 제거.
2. 2인 팀이라 모노레포의 단점(권한·빌드 격리 필요성)이 발현되지 않음.
3. 시연 배포(D13) 시 "커밋 해시 1개 = seed + BE + FE 상태 고정" — seed 동결 절차가 태그 하나로 끝남.

## 결과 (트레이드오프 수용)
- 파이프라인을 독립 repo 포트폴리오 피스로 보여주는 가치는 포기 — 대신 모노레포 README에서 pipeline/ 섹션으로 서사화.
- CI를 도입할 경우 경로 필터(paths:) 설정 필요 — 수용.
