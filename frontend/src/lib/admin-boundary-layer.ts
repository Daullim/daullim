import type {
  AdminDongBoundaryFeature,
  AdminDongBoundaryFeatureCollection,
} from "@/api/types";

/** 색은 `tokens.css`가 정본이라 런타임에 읽는다 — hex를 여기서 복제하지 않는다. */
function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function adminBoundaryStyles() {
  return {
    base: {
      fillColor: token("--color-accent"),
      fillOpacity: 0.04,
      strokeColor: token("--color-accent-hover"),
      strokeWeight: 2,
      strokeOpacity: 0.75,
      clickable: true,
    } satisfies naver.maps.StyleOptions,
    selected: {
      fillColor: token("--color-risk-warn"),
      fillOpacity: 0.16,
      strokeColor: token("--color-risk-warn"),
      strokeWeight: 4,
      strokeOpacity: 1,
    } satisfies naver.maps.StyleOptions,
  };
}

export function filterToSigungu(
  collection: AdminDongBoundaryFeatureCollection,
  sigunguCd: string,
): AdminDongBoundaryFeatureCollection {
  return {
    type: "FeatureCollection",
    features: collection.features.filter((f) => f.properties.sigungu_cd === sigunguCd),
  };
}

export function filterToDong(
  collection: AdminDongBoundaryFeatureCollection,
  dongCd: string,
): AdminDongBoundaryFeatureCollection {
  return {
    type: "FeatureCollection",
    features: collection.features.filter((f) => f.properties.dong_cd === dongCd),
  };
}

function eachCoordinate(
  feature: AdminDongBoundaryFeature,
  visit: (lng: number, lat: number) => void,
) {
  if (feature.geometry.type === "Polygon") {
    for (const ring of feature.geometry.coordinates) {
      for (const [lng, lat] of ring) visit(lng, lat);
    }
    return;
  }

  for (const polygon of feature.geometry.coordinates) {
    for (const ring of polygon) {
      for (const [lng, lat] of ring) visit(lng, lat);
    }
  }
}

/** 행정동 경계 전체를 담는 경계 — 시군구/동 선택 시 화면을 실제 폴리곤에 맞춘다. */
export function boundsOfAdminBoundary(
  collection: AdminDongBoundaryFeatureCollection,
): naver.maps.LatLngBounds | null {
  let bounds: naver.maps.LatLngBounds | null = null;

  for (const feature of collection.features) {
    eachCoordinate(feature, (lng, lat) => {
      const point = new naver.maps.LatLng(lat, lng);
      if (!bounds) {
        bounds = new naver.maps.LatLngBounds(point, point);
      } else {
        bounds.extend(point);
      }
    });
  }

  return bounds;
}
