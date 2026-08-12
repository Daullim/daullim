import type {
  AdminDongBoundaryFeature,
  AdminDongBoundaryFeatureCollection,
} from "@/api/types";
import type { RiskLevel } from "@/config/domain";
import { FILL_OPACITY, RISK_TOKEN } from "@/lib/grid-layer";

/** 색은 `tokens.css`가 정본이라 런타임에 읽는다 — hex를 여기서 복제하지 않는다. */
function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * 관제 ① 동 경계 코로플레스 — 격자와 **같은 농도 규칙**(DESIGN.md § 격자 위험 코로플레스).
 *
 * 등급이 폴리곤 속성에 없다. 경계 GeoJSON은 정적 파일이라 `dong_cd`밖에 모르고 등급은
 * `GET /regions/dongs`가 준다 — 그래서 스타일 함수가 아니라 **조회 결과를 받아** 만든다.
 *
 * 선택은 격자와 같이 **테두리로만** 표시한다. 면을 브랜드색으로 덮으면 고르는 순간
 * 그 동의 위험도가 지워진다.
 */
export function adminChoroplethStyles(levelByDong: Map<string, RiskLevel | null>) {
  /* 면 농도가 낮아(최대 0.14) 경계선이 옅으면 동이 어디서 갈리는지 안 읽힌다 —
     격자(1km 균일 사각형)와 달리 행정동은 모양이 제각각이라 윤곽이 곧 식별 정보다 */
  const stroke = {
    strokeColor: token("--color-subtle"),
    strokeWeight: 2,
    strokeOpacity: 1,
    clickable: true,
    zIndex: 1,
  };

  return {
    base: ((feature) => {
      const dongCd = feature.getProperty("dong_cd");
      const level = typeof dongCd === "string" ? levelByDong.get(dongCd) : null;
      // 건물이 없는 동 — 없는 근거를 색으로 지어내지 않고 회색으로 둔다
      if (!level) {
        return { ...stroke, fillColor: token("--color-ink"), fillOpacity: 0.02 };
      }
      return { ...stroke, fillColor: token(RISK_TOKEN[level]), fillOpacity: FILL_OPACITY[level] };
    }) satisfies naver.maps.StylingFunction,

    /** 맞닿은 이웃 폴리곤의 실선에 덮이지 않도록 위로 올린다 */
    selected: {
      strokeColor: token("--color-brand"),
      strokeWeight: 4,
      strokeOpacity: 1,
      zIndex: 100,
    } satisfies naver.maps.StyleOptions,
  };
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
