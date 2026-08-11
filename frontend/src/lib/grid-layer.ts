import type { GridFeatureCollection } from "@/api/types";
import type { RiskLevel } from "@/config/domain";

/**
 * 격자 폴리곤 레이어의 표시 규칙 — **아주 옅은 코로플레스**(DESIGN.md § 격자 위험 코로플레스).
 *
 * 면을 위험 등급 색으로 채우되 농도를 매우 낮게 둔다. 지도는 "어디가 뜨거운가"를 눈으로 훑는
 * 도구이고, 정확한 등급·점수는 리스트의 `RiskBadge`가 이미 말한다 — 지도가 그걸 반복할 이유가 없다.
 *
 * **등급별로 농도가 다르다.** 실측(4지역 704격자)에서 `ok`가 65%(461개)라 세 등급을 같은 농도로
 * 칠하면 화면 대부분이 초록으로 덮여 오히려 위험 격자가 묻힌다. 안전한 쪽을 더 옅게 해
 * **눈이 danger·warn에 먼저 가도록** 기울였다.
 *
 * 선택 강조는 위험 표현이 아니라 **리스트와 지도가 같은 격자를 가리킨다는 신호**라 별개 축이다 —
 * 그래서 면 색을 브랜드색으로 덮지 않고 테두리만 바꾼다. 덮으면 선택하는 순간 그 격자의 위험도가 사라진다.
 */

/** 색은 `tokens.css`가 정본이라 런타임에 읽는다 — 여기에 hex를 복제하면 두 벌이 된다. */
function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * 등급별 면 농도. 범례·`RiskBadge`와 **같은 토큰**을 쓰고 농도만 따로 정한다.
 *
 * `ok`도 0이 아닌 이유는 클릭 판정 때문이다 — `fillOpacity: 0`이면 면이 이벤트를 받지 않아
 * 격자를 눌러도 선택되지 않는다.
 */
const FILL_OPACITY: Record<RiskLevel, number> = {
  danger: 0.14,
  warn: 0.08,
  ok: 0.03,
};

const RISK_TOKEN: Record<RiskLevel, string> = {
  danger: "--color-risk-danger",
  warn: "--color-risk-warn",
  ok: "--color-risk-ok",
};

function isRiskLevel(value: unknown): value is RiskLevel {
  return value === "danger" || value === "warn" || value === "ok";
}

const Z_BASE = 1;
const Z_SELECTED = 100;

export function gridStyles() {
  const stroke = {
    strokeColor: token("--color-hairline-strong"),
    strokeWeight: 1,
    strokeOpacity: 0.8,
    clickable: true,
    zIndex: Z_BASE,
  };

  return {
    /**
     * 격자마다 다른 색이라 함수로 준다(`setStyle`은 `StylingFunction`을 받는다).
     * 등급이 없는 격자는 회색으로 — 없는 근거를 색으로 지어내지 않는다.
     */
    base: ((feature) => {
      const level = feature.getProperty("risk_level_cd");
      if (!isRiskLevel(level)) {
        return { ...stroke, fillColor: token("--color-ink"), fillOpacity: 0.02 };
      }
      return {
        ...stroke,
        fillColor: token(RISK_TOKEN[level]),
        fillOpacity: FILL_OPACITY[level],
      };
    }) satisfies naver.maps.StylingFunction,

    /**
     * 선택 — 테두리만 바꾼다. 면은 그대로 둬 위험도가 계속 읽힌다.
     * `zIndex`로 맨 위에 올려야 맞닿은 이웃 격자의 실선에 덮이지 않는다.
     */
    selected: {
      strokeColor: token("--color-brand"),
      strokeWeight: 3,
      strokeOpacity: 1,
      zIndex: Z_SELECTED,
    } satisfies naver.maps.StyleOptions,
  };
}

/**
 * 이 동에 속한 격자만 남긴다.
 *
 * GeoJSON에는 행정동 속성이 없다(전국 485격자가 통째로 온다). 어느 격자가 이 동에 속하는지는
 * `GET /grids/summary`가 내려준 `gridId` 목록만 안다 — 그래서 두 응답이 모두 있어야 그릴 수 있다.
 */
export function filterToDong(
  collection: GridFeatureCollection,
  gridIds: Set<string>,
): GridFeatureCollection {
  return {
    type: "FeatureCollection",
    features: collection.features.filter((f) => gridIds.has(f.properties.grid_id)),
  };
}

/**
 * 격자 중심 — 거리순 정렬의 기준점.
 *
 * 1km 사각형이라 꼭짓점 평균이 곧 중심이다(마지막 점이 첫 점과 겹치는 GeoJSON 관례를 빼고 센다).
 * 정확한 무게중심을 구할 이유가 없다 — 격자 간 거리 비교에 1km 격자 안의 오차는 순위를 바꾸지 않는다.
 */
export function centerOf(feature: GridFeatureCollection["features"][number]) {
  const ring = feature.geometry.coordinates[0].slice(0, -1);
  const sum = ring.reduce((acc, [lng, lat]) => ({ lat: acc.lat + lat, lng: acc.lng + lng }), {
    lat: 0,
    lng: 0,
  });
  return { lat: sum.lat / ring.length, lng: sum.lng / ring.length };
}

/** 폴리곤 전체를 담는 경계 — 동에 진입하면 격자가 다 보이도록 맞춘다. */
export function boundsOf(collection: GridFeatureCollection): naver.maps.LatLngBounds | null {
  const ring = collection.features[0]?.geometry.coordinates[0]?.[0];
  if (!ring) return null;

  const bounds = new naver.maps.LatLngBounds(
    new naver.maps.LatLng(ring[1], ring[0]),
    new naver.maps.LatLng(ring[1], ring[0]),
  );
  for (const feature of collection.features) {
    for (const [lng, lat] of feature.geometry.coordinates[0]) {
      bounds.extend(new naver.maps.LatLng(lat, lng));
    }
  }
  return bounds;
}
