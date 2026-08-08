---
version: 1.0.0
name: daullim-design-system
description: 다울림(일반주택 화재경보기 사후관리 우선순위 처방 엔진)의 "차분한 관제실(calm control-room)" 디자인 시스템 — 회백 캔버스 위 흰 서피스, 관제 블루 악센트 1색, 저채도 위험 3색(레드·앰버·그린)이 유일한 색 서사. 전 텍스트 단일 서체(Pretendard), 데이터 값은 동일 서체 + tabular 숫자. hairline 보더 우선, 라이트 테마 단일, 장식 없음.

palette: # [primitive 계층] — 실제 hex는 여기와 tokens.css 내부에만 존재
  gray-0: "#ffffff"
  gray-50: "#f7f8fa"
  gray-100: "#eff1f4"
  gray-200: "#e2e5ea"
  gray-300: "#cbd1d9"
  gray-400: "#9aa3af"
  gray-500: "#6b7280"
  gray-600: "#4b5563"
  gray-700: "#374151"
  gray-800: "#1f2937"
  gray-900: "#111827"
  blue-50: "#eef4fc"   # 악센트 "관제 블루" 스케일
  blue-100: "#d9e6f8"
  blue-200: "#b3cdf1"
  blue-600: "#1e5ab8"  # vs white 6.54:1 (AA), white-on-blue 6.54:1 (AA)
  blue-700: "#17488f"
  red-50: "#fceeec"    # 위험(danger) 저채도 스케일
  red-200: "#f0c4c0"
  red-600: "#b3261e"   # vs white 6.54:1 (AA)
  red-700: "#8f1e18"
  amber-50: "#fbf3e1"  # 경고(warn) 저채도 스케일
  amber-200: "#ebd5a8"
  amber-600: "#8a5a00" # vs white 5.93:1 (AA)
  amber-700: "#6e4800"
  green-50: "#eaf5ee"  # 양호(ok) 저채도 스케일
  green-200: "#bfe0ca"
  green-600: "#1b7339" # vs white 5.90:1 (AA)
  green-700: "#155c2e"

colors: # [semantic 계층] — 컴포넌트·화면이 참조하는 유일한 계층. palette만 참조.
  bg-canvas: "{palette.gray-50}"        # 페이지 바닥
  bg-surface: "{palette.gray-0}"        # 카드·테이블·패널·오버레이
  bg-muted: "{palette.gray-100}"        # 구분 영역·비활성 표면·호버 틴트
  bg-dark: "{palette.gray-900}"         # 유일한 다크 서피스 — 관제 하단 요약 바 한 곳
  border-hairline: "{palette.gray-200}" # 1차 구분 수단
  border-strong: "{palette.gray-300}"   # 입력 필드·강조 구분
  text-ink: "{palette.gray-900}"        # 제목·핵심 텍스트 (17.74:1)
  text-body: "{palette.gray-700}"       # 본문 (10.31:1)
  text-muted: "{palette.gray-500}"      # 보조 텍스트 (4.83:1 — AA 하한 위)
  text-on-accent: "{palette.gray-0}"
  text-on-dark: "{palette.gray-50}"
  text-on-dark-soft: "{palette.gray-400}"
  accent: "{palette.blue-600}"          # 악센트 = 관제 블루. 위험 3색과 색상군 분리
  accent-hover: "{palette.blue-700}"
  accent-tint: "{palette.blue-50}"      # 선택 배경·정보성 틴트
  accent-line: "{palette.blue-200}"
  risk-danger: "{palette.red-600}"
  risk-danger-tint: "{palette.red-50}"
  risk-danger-line: "{palette.red-200}"
  risk-warn: "{palette.amber-600}"
  risk-warn-tint: "{palette.amber-50}"
  risk-warn-line: "{palette.amber-200}"
  risk-ok: "{palette.green-600}"
  risk-ok-tint: "{palette.green-50}"
  risk-ok-line: "{palette.green-200}"
  status-neutral: "{palette.gray-500}"        # 점검 상태 톤 슬롯 — 상태명 매핑은
  status-neutral-tint: "{palette.gray-100}"   # src/config/domain.ts에서만 주입(미합의)
  status-positive: "{colors.risk-ok}"
  status-positive-tint: "{colors.risk-ok-tint}"
  status-negative: "{colors.risk-danger}"
  status-negative-tint: "{colors.risk-danger-tint}"
  status-caution: "{colors.risk-warn}"
  status-caution-tint: "{colors.risk-warn-tint}"
  status-info: "{colors.accent}"
  status-info-tint: "{colors.accent-tint}"
  focus-ring: "{palette.blue-600}"
  offline-bar: "{palette.amber-600}"
  offline-bar-bg: "{palette.amber-50}"

typography: # 굵기는 400/600 두 단계만. 전 텍스트 단일 서체(Pretendard).
  display-sm:
    fontFamily: "Pretendard Variable, Pretendard, sans-serif"
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.25
  title:
    fontFamily: "Pretendard Variable, Pretendard, sans-serif"
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.4
  title-sm:
    fontFamily: "Pretendard Variable, Pretendard, sans-serif"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.4
  body-md:
    fontFamily: "Pretendard Variable, Pretendard, sans-serif"
    fontSize: 16px      # /field 폼 본문 최소값
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "Pretendard Variable, Pretendard, sans-serif"
    fontSize: 14px      # /control 테이블 본문
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: "Pretendard Variable, Pretendard, sans-serif"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.4
  data:
    fontFamily: "Pretendard Variable, Pretendard, sans-serif"
    fontSize: inherit   # 주변 크기를 따르고 tabular 숫자만 적용(별도 서체 아님)
    fontWeight: 400
    lineHeight: inherit
    fontVariantNumeric: tabular-nums
  data-lg:
    fontFamily: "Pretendard Variable, Pretendard, sans-serif"
    fontSize: 24px      # 요약 카운터 숫자
    fontWeight: 600
    lineHeight: 1.2
    fontVariantNumeric: tabular-nums
  button:
    fontFamily: "Pretendard Variable, Pretendard, sans-serif"
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1

rounded: # 16px 초과 금지. pill은 상태 태그·모드 토글 전용.
  xs: 4px    # 미니 칩·인라인 강조 바(Error/Offline)
  sm: 6px    # 입력·소형 버튼
  md: 8px    # 버튼·카드·테이블 컨테이너
  lg: 12px   # 드로어·오버레이·큰 카드
  xl: 16px   # 상한선 — 기본 사용 금지, 지도 말풍선 최대 한도로만 예약
  pill: 9999px

spacing: # 8px 그리드 (12px은 절반 단계로 허용)
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 64px  # 업무 도구 — 마케팅용 96px을 쓰지 않는다

states: # 전 컴포넌트 공통 인터랙션 문법 (재발명 금지)
  hover: "배경 틴트만 — {colors.bg-muted} 또는 {colors.accent-tint}. 이동·확대·그림자 변화 금지"
  focus-ring: "2px solid {colors.focus-ring}, outline-offset 2px — :focus-visible 전역 1회 정의"
  selected: "{colors.accent-tint} 배경 + {colors.accent} 보더(또는 좌측 4px 악센트 바)"
  disabled: "opacity 0.5 + cursor-not-allowed. 색값 변경으로 표현하지 않는다"
  estimated: "점선 보더 — 색이 아니라 형태로 구분. 본문 값(EstimateBorder·ConditionBadge)에는 '(추정)' 라벨 병기, 배지(RiskBadge)는 점선만(범례가 설명)"

components: # 코어 8종 — 토큰 조합 정의 (구현: src/components/core/)
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.text-on-accent}"
    hoverBackgroundColor: "{colors.accent-hover}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    height-md: 40px
    height-field-lg: 48px  # /field 보조 액션 (터치 타깃 44px 이상, field-xl보다 낮은 위계)
    height-field-xl: 64px  # /field 3-way·주요 액션 (장갑 착용)
  button-secondary:
    backgroundColor: "{colors.bg-surface}"
    textColor: "{colors.text-ink}"
    border: "1px solid {colors.border-strong}"
    hoverBackgroundColor: "{colors.bg-muted}"
    rounded: "{rounded.md}"
  button-danger:
    backgroundColor: "{colors.risk-danger}"
    textColor: "{colors.text-on-accent}"
    rounded: "{rounded.md}"
  status-tag:
    backgroundColor: "{colors.status-*-tint}"   # 톤은 config에서 주입
    textColor: "{colors.status-*}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  risk-badge:
    backgroundColor: "{colors.risk-*-tint}"
    textColor: "{colors.risk-*}"
    border: "1px solid {colors.risk-*-line}"
    content: "라벨 + 수치 병기 필수 — 색 단독 금지"
    rounded: "{rounded.sm}"
    typography: "{typography.caption} + {typography.data}"
  data-text:
    typography: "{typography.data}"   # Pretendard + tabular 숫자
    textColor: "inherit (기본) | {colors.text-body}"
    use: "risk_score·grid_id·rx_code·좌표·건수 — 값이면 무조건 이 래퍼로"
  estimate-border:
    solid: "1px solid {colors.border-strong} = 실측"
    dashed: "1px dashed {colors.border-strong} = 추정 + '(추정)' 라벨 필수"
    rounded: "{rounded.md}"
  queue-row:
    backgroundColor: "{colors.bg-surface}"
    hoverBackgroundColor: "{colors.bg-muted}"
    selectedBackgroundColor: "{colors.accent-tint} + 좌측 4px {colors.accent} 바"
    borderBottom: "1px solid {colors.border-hairline}"
    height: "고정 — /control 48px, /field 64px (폴링 갱신 CLS 0)"
    cells: "순위·점수·격자ID는 DataText(tabular 숫자), 주소·기준은 본문"
  region-selector:
    control: "shadcn/ui Select(Radix) 3연쇄 — 시·도 → 시·군·구 → 읍·면·동"
    height: "/control 40px, /field 44px"
    border: "1px solid {colors.border-strong}"
    rounded: "{rounded.sm}"
  honesty-label:
    backgroundColor: "{colors.bg-muted}"
    textColor: "{colors.text-body}"
    icon: "ⓘ 문자 — 아이콘 라이브러리 도입 안 함"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    copy: "격자 순위 = AI 위험 예측 · 격자 안 주택 순서 = 보급연차·동선 기준"
---

## Overview

다울림은 소방 점검원과 관제 담당자가 쓰는 **정부/소방 행정용 업무 도구**다. 시스템의 성격은 "차분한 관제실(calm control-room)" — 신뢰감이 우선이고 장식은 없다. 회백 캔버스(`{colors.bg-canvas}`) 위에 흰 서피스(`{colors.bg-surface}`)가 hairline 보더로 구획되고, 색은 오직 두 종류만 말한다: **관제 블루 악센트**(행동·선택·포커스)와 **위험 3구간**(레드·앰버·그린, 데이터의 위험 서사). 그 외 유채색은 존재하지 않는다.

**Key Characteristics:**
- 라이트 테마 단일. 다크 서피스는 관제 하단 요약 바(`{colors.bg-dark}`) 딱 한 곳 — Cal.com의 "dark footer는 유일한 다크 서피스" 원칙과 같은 절제.
- 악센트는 관제 블루 `{colors.accent}` (#1e5ab8) 1색. 위험 3색(적·황·녹 계열)과 색상군이 겹치지 않아 위험 신호로 오독되지 않는다.
- 위험 3구간(위험/경고/양호)이 시스템의 유일한 색 서사. 전부 저채도 무광톤이면서 흰 배경 대비 WCAG AA 통과(6.54 / 5.93 / 5.90:1). **색 단독 사용 금지 — 항상 라벨 또는 수치 병기.**
- 실측/추정은 색이 아니라 **형태**(실선/점선 보더)로 구분. 범례 상시 노출. 본문 값에는 `(추정)` 라벨을 병기하고, 좁은 배지는 점선만으로 구분한다.
- 전 텍스트 단일 서체 Pretendard. 데이터 값(risk_score·grid_id·rx_code·좌표·건수)은 별도 서체 없이 `DataText`로 감싸 tabular 숫자만 적용해 열 정렬을 지킨다.
- hairline 보더가 1차 구분 수단. 그림자는 떠 있는 면에만 2단계(`--shadow-e1`/`--shadow-e2`). 그라디언트·글래스모피즘 금지.
- 밀도 2단: `/control`은 테이블 중심 중밀도(14px 본문·48px 행), `/field`는 저밀도(16px 본문·44px+ 터치 타깃·64px 3-way 버튼).
- 정직성 라벨(`honesty-label`)은 장식이 아니라 상설 디자인 요소다.

## Colors

### Brand (Accent)
- **Accent** (`{colors.accent}` — 관제 블루): 주요 액션 버튼, 선택 상태, 포커스 링, 링크, 정보성 배지. 블루 계열을 택한 이유 — 위험 3색(레드·앰버·그린)의 색상군과 완전히 분리되어 "행동"과 "위험 신호"가 절대 혼동되지 않는다.
- **Accent Hover** (`{colors.accent-hover}`): primary 버튼 hover/active.
- **Accent Tint** (`{colors.accent-tint}`): 선택된 행·핀의 배경, 정보성 안내 배경. 틴트 위 accent 텍스트 대비 5.91:1 (AA).

### Surface
- **Canvas** (`{colors.bg-canvas}`): 페이지 바닥. 순백이 아닌 회백 — 흰 서피스가 보더 없이도 살짝 떠 보이게 한다.
- **Surface** (`{colors.bg-surface}`): 카드·테이블·패널·오버레이. 데이터가 놓이는 면은 항상 흰색.
- **Muted** (`{colors.bg-muted}`): hover 틴트, 비활성 표면, 정직성 라벨 배경.
- **Dark** (`{colors.bg-dark}`): **유일한 다크 서피스** — `/control` 하단 요약 카운터 바 한 곳에만 허용. 다른 어디에도 다크 면을 만들지 않는다.
- **Hairline / Strong** (`{colors.border-hairline}` / `{colors.border-strong}`): hairline은 행 구분·카드 윤곽, strong은 입력 필드·독립 컨트롤.

### Text
- **Ink** (`{colors.text-ink}`, 17.74:1): 제목, 테이블 핵심 셀.
- **Body** (`{colors.text-body}`, 10.31:1): 본문.
- **Muted** (`{colors.text-muted}`, 4.83:1): 보조 정보·타임스탬프. AA 하한 위지만 여유가 적으므로 13px 미만으로 쓰지 않는다.
- **On Accent / On Dark / On Dark Soft**: 각각 악센트 면·다크 바 위 텍스트.

### Risk & Status — 사용 규칙 (별도 소단원)
위험 3구간은 시스템의 유일한 색 서사이며, 사용 문법이 고정돼 있다:

| 용도 | 처리 |
|---|---|
| 텍스트/수치 | `{colors.risk-*}` 본색을 흰/틴트 배경 위에. 전부 AA 통과 (danger 6.54 / warn 5.93 / ok 5.90 on white) |
| 배지/태그 배경 | 본색이 아니라 `{colors.risk-*-tint}` + 본색 텍스트 + `{colors.risk-*-line}` 1px 보더. 넓은 면적을 본색으로 칠하지 않는다 |
| 지도 핀 | 본색 채움 + 흰 테두리. 선택 시 말풍선에 등급 라벨·점수 병기. 렌더는 현재 지도 가시 영역 + 큐 응답 상한(`size=100`) 안으로 제한 |
| 버튼 | danger 버튼만 본색 solid 허용 (파괴적 액션) |
| **병기 의무** | **색 단독으로 정보를 전달하는 사용은 금지다.** 모든 위험 표시는 라벨("위험/경고/양호") 또는 수치(risk_score)를 동반한다 — 색약 대응(NFR-04), 야외 햇빛 사용 |

점검 **상태(status)** 색은 위험 색과 별도 축이다. 상태 모델이 미합의이므로(§Known Gaps) semantic 계층은 상태명이 아니라 **톤 슬롯**(neutral/positive/negative/caution/info)만 정의하고, 상태명 → 톤 매핑은 `src/config/domain.ts` 한 곳에서 주입한다. 화면·컴포넌트에 상태명 하드코딩 금지.

## Typography

### 계층

| Token | 서체 | 크기 | 굵기 | 행간 | 용도 |
|---|---|---|---|---|---|
| `{typography.display-sm}` | Pretendard | 28px | 600 | 1.25 | 화면 제목 (드릴다운 단계 제목) |
| `{typography.title}` | Pretendard | 18px | 600 | 1.4 | 패널·카드 제목 |
| `{typography.title-sm}` | Pretendard | 16px | 600 | 1.4 | 폼 섹션 라벨, 리스트 소제목 |
| `{typography.body-md}` | Pretendard | 16px | 400 | 1.5 | `/field` 본문 (최소값 — 더 줄이지 않는다) |
| `{typography.body-sm}` | Pretendard | 14px | 400 | 1.5 | `/control` 테이블 본문 |
| `{typography.caption}` | Pretendard | 13px | 500 | 1.4 | 태그·범례·타임스탬프 |
| `{typography.data}` | Pretendard (tabular 숫자) | 상속 | 400 | 상속 | 모든 데이터 값 |
| `{typography.data-lg}` | Pretendard (tabular 숫자) | 24px | 600 | 1.2 | 요약 카운터 숫자 |
| `{typography.button}` | Pretendard | 15px | 600 | 1 | 버튼 라벨 |

### 원칙 — 단일 서체(Pretendard), 데이터 값은 tabular 숫자
전 텍스트는 Pretendard 하나로 통일한다. `risk_score`, `grid_id`, `rx_code`, 좌표, 건수, 순위 등 **데이터 값은 `DataText`로 감싼다** — 별도 서체를 쓰지 않고 Pretendard의 tabular 숫자(`tabular-nums`)만 적용해 리스트·카운터의 숫자 열 정렬을 지키는 것이 목적이다. 굵기는 400/600 두 단계만 — 500·700 금지. 디스플레이 전용 서체 도입 금지(업무 도구).

## Layout

- **8px 그리드.** 스페이싱 토큰(`{spacing.*}`)만 사용, 12px은 절반 단계로 허용.
- **`/control` (태블릿 1024×768 가로 = 검증 기준, ≥1280은 여유 폭 활용):** 상단바(56px, 로고+소속+계정) → 지역 셀렉터+툴바(범례·`[현장모드로 전환]` primary) → 본문 2열 = 좌 지도(flex-1) + 우 큐 테이블(400px, ≥1280에서 480px) → 하단 다크 요약 바(64px). 큐 패널 헤더에 새로고침 아이콘 버튼+갱신 타임스탬프. 지도 영역 크기는 폴링과 무관하게 고정.
- **`/field` (태블릿 1024×768 가로 = 검증 기준):** **단일 상단바 하나만**(64px) — 좌측 햄버거(드로어 오픈) + 브레드크럼('동 선택', '관악구 은천동 › 격자 선택' …, `{typography.title}`) + 우측 `소속 | 이름 직급`. B1 본문 = 전면 지도 + 플로팅 오버레이, 하단 = 구 내 동 카드 가로 스크롤 리스트(평균 위험도 내림차순, 카드 탭=선택·버튼=진입(field-lg 48px), 카드 폭 256px·스트립 좌우 여백 20px, 선택 시 중앙 정렬 모션). B2·B3 본문 = **`/control` 큐 패널과 동형인 2열** — 좌 지도(flex-1) + 우 사이드 패널이 형제로 나란히(본문 패딩·열 간격 12px, 지도·패널 모두 `{rounded.md}` + hairline 보더, 패널에 그림자 없음). 패널은 기본 400px, 너비 320~560px 드래그 조절 — 조절값은 화면 이동 간 유지, 접기 버튼으로 완전 수납 — 수납 시 화면 우측 끝에 펼침 버튼만(접힘 시 지도가 본문 전체 폭). 접기/펼침 탭은 시각 폭 24px·투명 히트영역 44px. 줌·현재 위치·범례는 지도 박스 안 플로팅으로 남는다. B2 격자 행 = '동 + 1km 격자 코드'(`삼성동 다사4941` — 구역 번호 발번 규칙 미정이라 코드가 곧 식별자) + **주택 수**·방문율(방문/전체), 헤더 아래 정렬 필터 3종(위험순·미방문 주택 많은 순·거리순). 거리순은 현재 위치가 잡힌 뒤 활성되고, 거리는 현재 위치에서 격자 중심까지의 직선거리다. **대상·방문은 건물 축이다** — GeoJSON의 `households`는 SGIS 인구 가구 수라 모집단이 다르고, 방문 건물 수와 나란히 두면 비교할 수 없는 두 수를 견주게 된다. 지도 하단 중앙 = '현재 위치로 이동' 플로팅 버튼 — 단말 위치 권한을 받아 현재 위치 마커를 놓고 그 좌표로 이동한다. 권한 거부·실패 시 버튼 상태와 사유 문구로 되돌린다. B3 패널 = 헤더(제목 + 진행 카운트 N/M + 새로고침 아이콘 버튼 + 갱신 타임스탬프) → 헤더 아래 주소 검색창(방문 큐 실시간 필터, 결과 0건이면 `EmptyState`) → 방문 큐 리스트. **큐는 고정 목록** — 더 불러오는 하단 액션을 두지 않고, 갱신은 현장모드 종료 또는 새로고침 아이콘으로만 일어난다. B3 큐 행 = 주소 + 보조줄(최근 점검일 · 보급일(있을 때만) · 주택유형) + 3열에 `완료세대/전체세대`(단독·1세대는 미표시) + 위험 배지. 큐 행을 누르면 행 아래로 **액션 드롭다운**(길찾기 · 세대 보기, field-xl)이 슬라이드로 열린다. 지도 핀은 큐 응답 좌표로 찍고, 위험 등급 본색 채움 + 흰 테두리를 쓴다. 완료 주택은 흐리게 표시하고, 선택한 핀만 커지며 말풍선에 등급 라벨·점수를 병기한다. 핀을 누르면 해당 큐 행이 선택되고 목록 안에서 상단 여백 아래로 스크롤된다. **세대 목록 패널** — '세대 보기'로 지도 박스 안 우측(`inset-y-3 right-3`, 폭 320px, `{rounded.md}` + `--shadow-e2`)에 세대(호) 목록이 플로팅으로 뜬다. 구성은 헤더(좌상단 X 닫기 44px + 건물 주소 + 완료/전체) → **건축물대장 프리필 4항목 고정**(주택유형·층수·세대수·사용승인일, 2열 그리드 + `EstimateBorder` 실선=실측) → 세대 행 목록(라디오 선택 · 호수 · 마지막 점검일(이력 없으면 '미점검') · 상태 태그 대기/거부/완료) → **하단 고정 '점검하기'**. 우측 끝을 큐 패널 접기 탭 바로 앞에 맞춰 탭을 가리지 않는다. **점검 폼 진입은 세대를 선택한 뒤 하단 버튼으로만** — 다가구는 호수를 입력해야 활성된다. 건물 완료는 `완료 세대 수 = 전체 세대 수`로 파생한다. 세대 목록은 **서버가 준다**(`GET /buildings/{id}/units`) — 화면이 주택유형별로 행을 만들지 않는다. 출처(`hoNmSourceCd`)가 `expos`=전유부(다세대·연립) · `field`=현장 입력(다가구) · `implicit`=1행("본가구", 단독·다중)이고, **호수 입력이 열리는 행은 `field`뿐**이다(서버도 그 외는 403). 모바일 375는 깨지지-않음 수준.
- **아키타입 C — 점검 폼(풀스크린 오버레이)은 단계별 위저드다.** 한 화면에 한 단계만 렌더한다(세로로 쌓지 않는다). 단계는 `방문 승낙 확인 → 경보기 확인 → 소화기 확인 → 사후관리 → 최종 확인` 5개, **비승낙(거부·공가·두절)은 경보기·소화기를 물리적으로 수행할 수 없어 `방문 승낙 확인 → 사후관리 → 최종 확인` 3단계로 축약**된다. 본문 최상단에 `Step N / M` 캡션 + **단계명을 `{typography.display-sm}`(28px) 큰 제목**으로 둔다 — 한 단계 = 한 섹션이므로 `FormSection`의 자체 제목은 생략하고 이 제목이 대신한다. 하단 고정 바 = 좌 `이전`(첫 단계에선 `취소`) + 우 **`Step N - 단계명 →`**, 마지막 단계만 `제출하기`. **좌우 버튼 모두 field-xl(64px)로 높이를 맞춘다** — 위저드 바에서는 두 버튼이 한 쌍으로 읽혀야 해서 위계 차이를 폭(좌 w-32 고정 / 우 flex-1)으로만 준다. 다음 버튼은 그 단계의 필수값이 채워져야 활성된다. 단계 전환 시 본문 스크롤을 맨 위로 되돌리고 새 단계 제목으로 포커스를 옮긴다(Radix Dialog는 단계 전환을 모른다).
- **폼 안내문은 `InfoNote` 한 벌로 통일한다** — 아이콘(lucide `Info`) + `{typography.body-md}`(16px, `/field` 본문 최소값), 톤 4종(neutral·caution·positive·negative)은 status 틴트 슬롯과 1:1. 값 에코 박스(처방 결과·승낙 상태)는 안내문이 아니므로 아이콘을 붙이지 않는다. **실선/점선(실측/추정) 설명은 폼에 넣지 않는다** — 범례가 상시 노출되는 지도·리스트 화면에서만 설명한다. 폼에는 추정 개념 자체가 없다(ADR-013 결정 26) — 추정은 건물 위험 점수 축에만 남는다.
- **경보기 단계 구성** — `제조년월 확인`(제조년월 실측 + '표기 없음' 체크박스 — 라벨을 못 읽으면 연차를 추정하는 게 아니라 교체 대상이 된다) → `교체 필요 개수 확인`(구획된 실 개수 · 교체 필요 개수 2열)의 두 블록, 중제목은 `{typography.title}`(18px, 단계 제목 28px보다 한 단계 아래). 제조년월이 내용연수 판정을 좌우하므로 **항상 최상단**에 둔다.
- **경보기 입력은 실별 반복이 아니라 세대 단위 집계다.** 제조연차는 일괄 설치 가정으로 **공통 1회**만 받는다. **내용연수(15년) 경과 또는 제조년월 미표기면 교체 개수를 실 개수로 자동 확정하고 입력란을 비활성(회색)** 으로 두며 사유 입력을 생략한다(전량 '내용연수 지남' 또는 '제조년월 미표기'). 둘 다 실별로 따질 여지가 없다 — 다만 판정은 경과가 `내용연수경과`, 미표기가 `불량`으로 갈린다. 미경과면 작동 확인 안내 후 **교체 필요 개수**를 받고, **사유는 그 개수만큼** ①②③ 원형 배지로 구분해 항목별로 받는다(내용연수 지남·방전·외관이상·탈거·기타). 후속 입력도 항목 단위 — 방전 항목엔 전지 유형, 외관이상 항목엔 세부 4항목(오염·파손·오작동이력·결로). 파손만 불량, 나머지는 교체권고로 갈리는 판정 규칙의 입력원이다. 세대 종합 판정은 항목 최악값(불량 > 내용연수경과 > 교체권고 > 양호), 처방은 코드별 건수로 묶어 표시한다. 실 개수는 교체 개수의 분모(법상 설치 의무 수량)로 유지한다.
- **사후관리 단계 — 재방문 필요 여부는 필수다.** 이 값 하나가 세대가 큐에 남는지를 정한다(ADR-013). 승낙·거부·공가·두절 모두에서 받는다. **현장 교체를 '완료'로 고르면 선택지 대신 `재방문 불필요 — 현장 교체를 완료해 자동 확정` 확정 문구**로 바뀐다. 전량 교체 대상(경과·미표기)인데 교체도 재방문도 없이 끝내면 큐에서 영영 빠지므로 **`재방문하지 않는 사유` 자유 서술 칸이 나타나고 필수**가 된다(caution 보더로 강조). 채널(우편·기관 경유·직접 재방문) 안내는 두지 않는다 — 채널은 행정 레이어가 정하고 현장은 여부만 기록한다.
- **소화기는 개수를 세지 않는다.** 설치/미설치 2택만 받고, 설치됨이면 지시압력계 확인은 **입력 없이 안내문구로만** 둔다.
- **점검 기록 조회(`/records`):** 좌 캘린더 패널(360px) + 우 기록 표 2열, 관제 화면과 같은 `{rounded.md}` + hairline 카드 골격. 상단바 대신 얇은 헤더(뒤로가기 44px + `점검 기록` `{typography.title}` + 우측 해당 달 총 건수). 캘린더는 손으로 만든 월 그리드 — 기록이 있는 날에만 점 표식, 범례 문구는 두지 않는다. 표는 `RecordTable` 한 벌을 컬럼 조합으로 재사용한다(`날짜·시각·주소·세대·승낙·판정·교체완료` 중 선택, 주소만 남는 폭을 가져가며 `max-w-0 truncate` + `<TableHead>`에 `w-full`). 기록이 없으면 `점검 기록 없음` 한 줄. 행을 누르면 `ReviewSection`을 `readOnly`로 띄운 플로팅 상세 — 제출 안내·법적 각주를 끄고 요약 표만 남긴다. 같은 표 컴포넌트를 **점검 폼의 세대 방문 이력**(방문 승낙 확인 단계 하단)에도 그대로 쓴다.
- **지도 위 플로팅 오버레이:** `{colors.bg-surface}` 카드 + `{rounded.md}`, 칩·셀렉터는 `--shadow-e1`, 액션 카드는 `--shadow-e2`. 지도 가장자리 여백은 spacing 토큰. 인라인 메뉴 줄을 지도 위에 추가로 쌓지 않는다.
- **인증 화면(`/login`·`/signup`):** 앱에서 **유일하게 상단바 없는 중앙 카드** 레이아웃 — `bg-canvas` 위에 `max-w-100`(400px) `{rounded.md}` + hairline 보더 + `--shadow-e1` 카드. 카드 상단에 로고(`public/daullim-logo.png`, 높이 64px) → 화면 제목 `{typography.title}` → 입력 → 주요 버튼(field-lg, 폭 100%) → 하단 전환 링크. 입력은 `TextField`(라벨 + 44px 입력 + hint/error) 한 벌만 쓴다. **실제 인증에 연결돼 있다** — 로그인은 토큰을 받아 저장하고, 회원가입은 아이디 중복(409)을 아이디 필드의 `error`로 되돌린다. 오류는 `TextField`의 `error` 한 벌로만 표시한다(`alert()` 금지). `/` 진입은 `/login`으로 리다이렉트하되 **라우트 가드는 없다**(ADR-004 §1 v1.3) — 다만 토큰을 들고 간 요청이 401을 받으면(세션 만료) `/login`으로 되돌린다.
- **설정(`/settings`):** 관제 상단바(`mode="control"`)를 그대로 재사용하고 본문은 `max-w-160`(640px) 중앙 정렬 카드 3장 — **Tailwind 컨테이너 스케일(`max-w-2xl` 등) 금지**, `tokens.css`의 `--spacing-2xl`이 가려서 폭이 32px로 무너진다 — 계정(이름·소속 읽기 전용) / 지도 설정(네이버 지도 유형 3택 `일반지도·위성지도·지형지도`, 열거값은 `MAP_TYPE`) / 계정 관리(로그아웃 secondary · 회원탈퇴 danger, 둘 다 field-lg). **회원탈퇴는 비가역이므로 확인 다이얼로그를 거친다.** 지도 유형만 LocalStorage에 저장하고(`lib/prefs.ts`) **계정·비밀번호는 저장하지 않는다.** 드로어의 '설정' 메뉴가 유일한 진입점이며, 라우트가 없는 나머지 메뉴 항목은 `disabled`로 둔다.
- **드로어(/field·/control 공용):** 좌측 Sheet — 상단 고정 점검관·소속, 메뉴 항목(`{typography.title}`, ≥44px), 하단 고정 danger 버튼(field-xl) — 현장 '현장점검 종료'(`/control` 복귀) / 관제 '로그아웃'(로그인 미구현 — 플레이스홀더). focus trap·ESC는 Radix에 위임.
- 컨테이너 내부 패딩: 패널 `{spacing.md}`(16px), 카드 `{spacing.lg}`(24px), 폼 섹션 간격 `{spacing.lg}`.

## Elevation & Depth

| 레벨 | 처리 | 용도 |
|---|---|---|
| Flat | 보더 없음 | 캔버스 위 텍스트 영역 |
| Hairline | 1px `{colors.border-hairline}` | **1차 구분 수단** — 카드, 테이블 행, 패널 경계 |
| e1 | `--shadow-e1` (0 1px 2px, 6% 알파) | 셀렉트 드롭다운, 지도 위 범례 칩 |
| e2 | `--shadow-e2` (0 4px 12px, 10% 알파) | 오버레이(점검 폼), 드로어, 말풍선 |

그림자는 "떠 있는 면"에만. 카드가 캔버스 위에 놓일 때는 보더로 충분하다. 그라디언트·글래스모피즘·네우모피즘 금지.

## Shapes

| Token | 값 | 용도 |
|---|---|---|
| `{rounded.xs}` | 4px | 미니 칩, 인라인 강조 바 |
| `{rounded.sm}` | 6px | 입력 필드, 셀렉트, 소형 버튼 |
| `{rounded.md}` | 8px | 버튼, 카드, 테이블 컨테이너 |
| `{rounded.lg}` | 12px | 오버레이, 드로어, 큰 카드 |
| `{rounded.xl}` | 16px | **상한선** — 기본 사용 금지, 지도 말풍선 한도로만 예약 |
| `{rounded.pill}` | 9999px | 상태 태그, 모드 토글에만 허용 |

**실선/점선 규칙 (형태 = 데이터 출처):** 실선 보더 = 실측, 점선 보더 = 추정. 이 구분을 색으로 대체하지 않는다. 범례(`실선=실측 / 점선=추정`)는 지도·리스트 화면에 상시 노출. `(추정)` 텍스트 라벨은 **본문 값**(`EstimateBorder`·`ConditionBadge`)에만 병기하고, **좁은 배지(`RiskBadge`)는 점선 보더만**으로 구분한다 — 상시 범례가 의미를 설명하므로 배지마다 라벨을 반복하지 않는다(스크린리더용 `aria-label`에는 유지).

## Components

코어 8종은 전부 **shadcn/ui(Radix) 프리미티브 위의 도메인 래퍼**다. focus trap·키보드 내비게이션·ARIA를 직접 구현하지 않는다. `variant`/`size`는 유니언 타입 열거로 제한하고, 도메인 열거값(상태·처방·위험구간)은 `src/config/domain.ts`에서 주입한다. `className` 관통은 레이아웃 여백 조정용으로만 — 색·폰트 오버라이드 금지.

1. **`Button`** (`{components.button-primary}` 외) — primary(악센트 solid) / secondary(흰 배경+strong 보더) / danger(risk-danger solid). 크기 `md`(40px) / `field-lg`(48px, `/field` 보조 액션) / `field-xl`(64px, `/field` 주요 액션·3-way). hover는 배경만 진해진다.
2. **`StatusTag`** (`{components.status-tag}`) — pill, 톤 틴트 배경 + 라벨. **variant는 `VisitStatus` 열거형 — 값 목록은 config에서만.** 톤 슬롯(neutral/positive/negative/caution/info)으로 색 결정.
3. **`RiskBadge`** (`{components.risk-badge}`) — 위험/경고/양호 3구간. 틴트 배경 + line 보더 + **라벨 + 수치 병기 필수형** — 수치 없는 사용은 라벨만이라도 강제.
4. **`DataText`** (`{components.data-text}`) — 데이터 값 표기 래퍼(Pretendard + tabular 숫자). `<DataText>GA-0412</DataText>`. 값이면 무조건 이걸 통과시킨다.
5. **`EstimateBorder`** (`{components.estimate-border}`) — `measured`(실선) / `estimated`(점선 + `(추정)` 라벨 자동 부착) 래퍼.
6. **`QueueRow`** (`{components.queue-row}`) — 순위·주소·분석기준·처방·상태·점수 한 행. 행 높이 고정(CLS 0). 선택 시 악센트 틴트 + 좌측 4px 악센트 바. SCR-02의 원자.
7. **`RegionSelector`** (`{components.region-selector}`) — shadcn Select 3연쇄(시·도→시·군·구→읍·면·동). 상위 변경 시 하위 리셋. `/field`에서 트리거 높이 44px.
8. **`HonestyLabel`** (`{components.honesty-label}`) — 정직성 라벨 상설 컴포넌트. 표준 문구: "격자 순위 = AI 위험 예측 · 격자 안 주택 순서 = 보급연차·동선 기준". 추정값 화면에는 `(추정)` 규칙과 함께 노출.

시스템 상태 보조 컴포넌트(§System States 구현): `LastUpdated`, `EmptyState`, `ErrorInline`, `OfflineBar`, `RowSkeleton` — `src/components/core/system-states.tsx`.

## Interaction States

전 컴포넌트 공통 문법 — 컴포넌트마다 재발명하지 않는다:

| 상태 | 처리 |
|---|---|
| Default | 토큰 기본값 |
| Hover | **배경 틴트만** (`{colors.bg-muted}` 또는 악센트 계열은 `{colors.accent-hover}`/`{colors.accent-tint}`). 이동·확대·그림자 추가 금지 |
| Focus | `:focus-visible` 전역 1회 정의 — `2px solid {colors.focus-ring}`, offset 2px. 모든 조작 요소에 동일하게 나타난다 |
| Active·Selected | `{colors.accent-tint}` 배경 + `{colors.accent}` 보더 또는 좌측 4px 악센트 바 |
| Disabled | opacity 0.5 + `cursor: not-allowed`. 색값을 바꿔 표현하지 않는다 |

**키보드 규칙 (WCAG 2.1 AA):** 점검 폼 전체가 키보드만으로 완주 가능. Tab 순서 = 시각 순서. 3-way 버튼·상태 태그에 ARIA 라벨. 오버레이는 Radix Dialog에 위임 — focus trap + ESC 닫기 + 닫힘 시 트리거로 포커스 복귀.

## System States

Loading/Empty/Error/Offline은 화면마다 즉흥 처리하지 않고 한 벌의 패턴으로 고정한다:

| 상태 | 표준 패턴 | 표준 문구 |
|---|---|---|
| Loading | **자리 유지형** — 이전 데이터 유지 + `LastUpdated`("마지막 갱신: N초 전"). 첫 로드만 `RowSkeleton`(행 높이 = 실데이터와 동일, CLS 0). 스피너 오버레이 금지 | — |
| Empty | 아이콘 없음. `{colors.text-body}` 안내 + 다음 행동 1개 | "이 관할·분기의 산출 결과가 없습니다" + `[다시 불러오기]` |
| Error | `{colors.risk-danger-tint}` 인라인 바(화면 전환 아님) + 좌측 4px danger 바 + 재시도. 기술 용어 노출 금지 | "불러오지 못했습니다. 네트워크 확인 후 다시 시도해 주세요." + `[다시 시도]` |
| Offline | 상단 고정 바 — `{colors.offline-bar-bg}` 배경 + 좌측 4px `{colors.offline-bar}` | "오프라인 — 점검 결과는 기기에 저장되고, 연결되면 자동 전송됩니다." |

폼 저장 실패(POST /visits)는 Error가 아니라 **Offline 플로우로 수렴** — LocalStorage 1건 보관 + `[재전송]` (PRD 확정). **실장됨** — 보관함은 `lib/pending-visit.ts`(1건 고정), 바는 B3 상단바 아래에 뜨고 재전송은 **보관해 둔 같은 `Idempotency-Key`로** 나가 중복 저장을 막는다. 수렴하는 것은 **연결 실패뿐이다** — 400·422는 다시 보내도 같은 답이 오므로 폼에서 고쳐야 하고, 보관함에 넣으면 영영 나가지 않는 건이 된다.

## Do's and Don'ts

### Do
- 모든 색·크기·라운드는 semantic 토큰으로만. 새 결정이 필요하면 **DESIGN.md 갱신 → tokens.css → 코드** 순서.
- 위험 표시에는 항상 라벨 또는 수치 병기 (`RiskBadge`가 강제한다).
- 값은 `DataText`로 감싼다(Pretendard + tabular 숫자). 전 텍스트 단일 서체.
- 추정 데이터는 점선 보더. 본문 값은 `EstimateBorder`로 `(추정)` 라벨까지, 배지는 점선만.
- hover는 배경 틴트만, 포커스는 전역 링 하나.
- 폴링 갱신 영역(큐·핀·타임스탬프)은 행 높이·컨테이너 크기 고정.
- `/field` 조작 요소 ≥44px, 3-way ≥64px, 본문 ≥16px.

### Don't
- ❌ 인라인 hex, primitive(`--daul-*`) 직접 참조. (위반 예: `text-[#b3261e]` → `text-risk-danger`)
- ❌ 악센트·위험 3색 외 유채색 도입. (위반 예: 보라색 "신규" 배지)
- ❌ 색 단독 정보 전달. (위반 예: 라벨 없는 빨간 점만으로 위험 표시)
- ❌ 다크 서피스 추가. (관제 요약 바 한 곳뿐)
- ❌ 16px 초과 라운드, 카드·버튼에 pill. (소비자 앱 인상)
- ❌ 굵기 500/700, 디스플레이 서체 도입.
- ❌ 스피너 오버레이로 폴링 로딩 표현. (자리 유지형만)
- ❌ 상태명("승낙"/"거부" 등) 화면 하드코딩. (config 주입만)
- ❌ hover에서 요소 이동·확대·그림자 추가.

## Responsive Behavior

### 브레이크포인트와 우선순위

| 폭 | 대상 | 요구 수준 |
|---|---|---|
| ≥1280px | `/control` | 여유 폭 활용(큐 패널 480px 확장) — 검증 기준은 아래 1024와 공통 |
| **1024×768 가로** | `/control` · `/field` | **검증 기준 — 모든 화면·오버레이가 이 뷰포트에서 완성돼야 한다** |
| 768px | `/field` | 태블릿 세로 — 리스트 패널 폭 유지, 지도 축소 |
| 375px | `/field` | **깨지지-않음 best-effort** — 세로 스택(드릴다운 헤더 → 지도 → 리스트), 가로 스크롤 0, 터치 타깃 유지. 완성도 요구 없음 |

### `/field` 모바일 세로 스택 축약 규칙
지도+리스트 2열 → 1열 스택(지도 위 240px 고정, 리스트 아래). 드릴다운 헤더는 브레드크럼을 말줄임하되 "N단계/3"과 뒤로가기는 유지. 점검 오버레이는 전체화면화.

### 터치 타깃

| 요소 | 최소 |
|---|---|
| `/field` 모든 조작 요소 | 44×44px |
| 점검 폼 3-way 버튼(정상/방전/탈거) | **높이 64px** |
| `/field` 리스트 행 | 높이 64px |
| `/control` 버튼·행 | 40px / 48px |

## Iteration Guide (AI 작업 규칙)

1. **semantic 토큰만 참조** — Tailwind 유틸리티 `bg-canvas`/`text-ink`/`border-hairline`/`bg-brand`/`text-risk-danger` 등. 인라인 hex·`--daul-*` 직접 사용 금지.
2. DESIGN.md에 없는 결정이 필요해지면 **먼저 이 문서를 갱신**하고 tokens.css에 반영한 뒤 코드를 쓴다.
3. 컴포넌트 단위로 수정한다. 상태(variant) 추가는 유니언 타입 확장 + config 주입으로.
4. hover는 배경 틴트만. 포커스 링은 전역 정의를 신뢰하고 개별 컴포넌트에서 재정의하지 않는다.
5. 폴링 갱신 시 레이아웃 고정 — 행 높이·지도 컨테이너 크기를 바꾸는 코드를 쓰지 않는다.
6. 접근성 프리미티브는 shadcn/ui(Radix)에 위임 — 직접 구현 금지. 현재 보유: Dialog·Select·Sheet·Button·Skeleton. 없는 프리미티브(Tabs 등)가 필요해지면 손으로 만들지 말고 shadcn에서 추가한다.
7. 시연 샘플 데이터는 서울 관악구(도시)·전북 임실군(농촌) 기준으로 통일.
8. Tailwind에서 브랜드 악센트 유틸리티는 `brand-*`다 (`accent`는 shadcn 호버-틴트 슬롯이 선점).

## Known Gaps

- **방문결과(`consent_cd`) 표시 모델 미합의** (승낙·거부·공가·두절 vs 방문완료·부재·재방문·조치완료): `StatusTag`는 톤 슬롯만 알고, 상태명·목록은 `src/config/domain.ts`에서 주입. 합의 시 config 한 곳만 수정. 세대 단위는 대기/거부/완료 3종만 노출(`UnitStatus` = `VisitStatus`의 부분집합)하고, 게이트 4지약 → 3종 축약은 `CONSENT_TO_UNIT_STATUS` 한 곳에서만 한다 — 공가·연락두절을 '거부'로 묶는 것은 표시 편의이지 의미 합의가 아니다.
  진행상태 축(세대가 큐에 남는가)은 **ADR-013으로 확정** — 재방문 필요면 `pending`, 아니면 게이트 lookup을 따른다.
- **세대 목록 패널의 375px 거동 미정**: 지도+큐 2열이 1열로 스택되는 모바일에서 세 번째 플로팅 패널을 어떻게 둘지 결정 대기. 현재는 1024×768 기준만 완성.
- **도시 격자 위험 밀집 표시 방식 결정 대기** (격자 중심 색 도트 vs 리스트 전용): 격자 표시는 "옅은 실선 경계"까지만 구현. 결정 시 이 문서에 규칙 추가 후 구현.
- ~~동 경계 GeoJSON 미확보~~ → **해소(2026-08-06)**: B1이 `GET /regions/boundaries`의 행정동 외곽선을 그린다. 시군구를 고르면 그 구/군의 동 경계를 모두 얹어 `fitBounds`로 맞추고, 선택한 동만 진하게 강조한다. 폴리곤을 누르면 그 동이 선택돼 카드·셀렉터와 양방향으로 물린다. 도시 B2는 그대로 `GET /grids`의 1km 격자 경계를 쓴다.
- **격자 구역 번호('n구역') 발번 규칙 미정**: 규칙이 없어 **표시명을 만들지 않고** 1km 격자 코드(`다사4941`)를 그대로 식별자로 쓴다. 규칙이 서면 코드 옆에 표시명을 붙인다.
- 인쇄(점검 결과 출력) 스타일 미정의.

### 처분 확정 — 플레이스홀더 정리 (2026-08-08)

자리만 있고 동작하지 않던 요소들의 결말이다. **다시 열지 말 것.**

- ~~길찾기 버튼이 눌러도 반응 없음~~ → **구현됨**: B3 액션 행의 `길찾기`가 **네이버 지도** 웹 URL(`lib/map-link.ts`)을 새 탭으로 연다 — 화면 지도가 Naver Maps라 서비스를 통일했다(ADR-004 v1.8). 앱 스킴(`nmap://`)이 아니라 웹 URL인 이유는 앱이 없을 때 스킴이 조용히 실패해 고치려던 무반응 버튼 그대로가 되기 때문이다. 딥링크는 URL 규약이라 키·SDK·네트워크 호출이 없어 ADR-004 §2의 "외부 API 의존 0"과 어긋나지 않는다. **좌표는 경도,위도 순서다.**
- ~~드로어 '현재 진행 상황'이 비활성~~ → **라우트 신설**: `/field/progress`(현장 전용). 관제 드로어에서는 감춘다 — 팀 단위로 답할 데이터가 아직 없다(`visits`에 조직 축이 없다).
- ~~`GET /codes` 미구현~~ → **폐기**: FE 라벨 정본이 `config/domain.ts`라 런타임 의존이 없고 `CodeLookupIT`가 `domain.ts`↔seed 일치를 지킨다. 쓸 화면이 없어 죽은 엔드포인트가 된다.
- ~~`POST /visits/sync` 미구현~~ → **폐기**: `Idempotency-Key`가 대체한다. 오프라인 재전송은 같은 키로 `POST /units/{unitId}/visits`를 다시 보내는 것으로 끝난다.
