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
  estimated: "점선 보더 + '(추정)' 라벨 — 색이 아니라 형태로 구분"

components: # 코어 8종 — 토큰 조합 정의 (구현: src/components/core/)
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.text-on-accent}"
    hoverBackgroundColor: "{colors.accent-hover}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    height-md: 40px
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
- 실측/추정은 색이 아니라 **형태**(실선/점선 보더 + `(추정)` 라벨)로 구분. 범례 상시 노출.
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
| 지도 핀 | 본색 채움 + 흰 테두리. 핀 옆 또는 말풍선에 반드시 등급 라벨·점수 병기 |
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
- **`/control` (데스크톱 ≥1280 전용):** 상단바(56px) → 지역 셀렉터+툴바(줄) → 본문 2열 = 좌 지도(flex-1) + 우 큐 테이블(고정 480px) → 하단 다크 요약 바(64px). 지도 영역 크기는 폴링과 무관하게 고정.
- **`/field` (태블릿 1024×768 가로 = 검증 기준):** 상단바(56px) → 드릴다운 헤더(브레드크럼 + "N단계/3" 진행 표시, 48px 고정) → 본문 = 지도(flex-1) + 우측 리스트 패널(고정 360px). B1은 리스트 패널 대신 하단 요약 시트. 모바일 375는 세로 스택(지도 위, 리스트 아래)으로 축약 — 깨지지-않음 수준.
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

**실선/점선 규칙 (형태 = 데이터 출처):** 실선 보더 = 실측, 점선 보더 = 추정. 추정에는 항상 `(추정)` 라벨 병기. 이 구분을 색으로 대체하지 않는다. 범례(`실선=실측 / 점선=추정`)는 지도·리스트 화면에 상시 노출.

## Components

코어 8종은 전부 **shadcn/ui(Radix) 프리미티브 위의 도메인 래퍼**다. focus trap·키보드 내비게이션·ARIA를 직접 구현하지 않는다. `variant`/`size`는 유니언 타입 열거로 제한하고, 도메인 열거값(상태·처방·위험구간)은 `src/config/domain.ts`에서 주입한다. `className` 관통은 레이아웃 여백 조정용으로만 — 색·폰트 오버라이드 금지.

1. **`Button`** (`{components.button-primary}` 외) — primary(악센트 solid) / secondary(흰 배경+strong 보더) / danger(risk-danger solid). 크기 `md`(40px) / `field-xl`(64px, `/field` 주요 액션·3-way). hover는 배경만 진해진다.
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

폼 저장 실패(POST /visits)는 Error가 아니라 **Offline 플로우로 수렴** — LocalStorage 1건 보관 + `[재전송]` (PRD 확정).

## Do's and Don'ts

### Do
- 모든 색·크기·라운드는 semantic 토큰으로만. 새 결정이 필요하면 **DESIGN.md 갱신 → tokens.css → 코드** 순서.
- 위험 표시에는 항상 라벨 또는 수치 병기 (`RiskBadge`가 강제한다).
- 값은 `DataText`로 감싼다(Pretendard + tabular 숫자). 전 텍스트 단일 서체.
- 추정 데이터는 점선 + `(추정)` — `EstimateBorder` 사용.
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
| ≥1280px | `/control` | 전용 — 이 폭 미만 대응 의무 없음 (안내 문구만) |
| **1024×768 가로** | `/field` | **검증 기준 — 모든 `/field` 화면·오버레이가 이 뷰포트에서 완성돼야 한다** |
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
6. 접근성 프리미티브(Dialog·Select·Tabs)는 shadcn/ui(Radix)에 위임 — 직접 구현 금지.
7. 시연 샘플 데이터는 서울 관악구(도시)·전북 임실군(농촌) 기준으로 통일.
8. Tailwind에서 브랜드 악센트 유틸리티는 `brand-*`다 (`accent`는 shadcn 호버-틴트 슬롯이 선점).

## Known Gaps

- **방문/점검 상태 모델 미합의** (승낙·거부·공가·두절 vs 방문완료·부재·재방문·조치완료): `StatusTag`는 톤 슬롯만 알고, 상태명·목록은 `src/config/domain.ts`에서 주입. 합의 시 config 한 곳만 수정.
- **도시 격자 위험 밀집 표시 방식 결정 대기** (격자 중심 색 도트 vs 리스트 전용): 격자 표시는 "옅은 실선 경계"까지만 구현. 결정 시 이 문서에 규칙 추가 후 구현.
- **동 경계 GeoJSON 미확보**: 지도 경계는 플레이스홀더. react-leaflet 실장 시 지도 컨테이너 크기 고정 규칙(CLS 0)을 그대로 적용할 것.
- 지도 핀의 정확한 형태·크기 스펙(줌 레벨별)은 leaflet 실장 시점에 확정 — 색·라벨 병기 규칙은 본 문서를 따른다.
- 인쇄(점검 결과 출력) 스타일 미정의.
