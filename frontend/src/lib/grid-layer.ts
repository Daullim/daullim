import type { GridFeatureCollection } from "@/api/types";

/**
 * 격자 폴리곤 레이어의 표시 규칙.
 *
 * **"옅은 실선 경계"까지만 그린다**(DESIGN.md Known Gaps). 위험도로 면을 채우는 코로플레스는
 * 표시 방식이 아직 결정되지 않은 항목이라 여기서 임의로 정하지 않는다 — 위험도는 리스트의
 * `RiskBadge`가 이미 등급·점수로 말하고 있다.
 *
 * 선택 강조는 위험 표현이 아니라 **리스트와 지도가 같은 격자를 가리킨다는 신호**라 별개다.
 */

/** 색은 `tokens.css`가 정본이라 런타임에 읽는다 — 여기에 hex를 복제하면 두 벌이 된다. */
function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function gridStyles() {
  return {
    base: {
      fillColor: token("--color-ink"),
      // 면은 거의 투명하다 — 클릭을 받으려면 0이 아니어야 한다
      fillOpacity: 0.02,
      strokeColor: token("--color-hairline-strong"),
      strokeWeight: 1,
      strokeOpacity: 0.8,
      clickable: true,
    } satisfies naver.maps.StyleOptions,
    selected: {
      fillColor: token("--color-brand"),
      fillOpacity: 0.12,
      strokeColor: token("--color-brand"),
      strokeWeight: 3,
      strokeOpacity: 1,
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
