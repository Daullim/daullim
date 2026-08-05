import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 현재 위치 — 권한 요청 · 마커 · 시점 이동을 한 덩어리로 다룬다.
 *
 * `watchPosition`이 아니라 **버튼을 눌렀을 때만** 한 번 받는다. 태블릿을 종일 켜 두는 현장에서
 * 상시 추적은 배터리를 갉아먹고, 화면이 요구하는 것도 "지금 내가 어디인가" 한 번이다.
 *
 * 좌표를 화면 상태로 올리는 이유는 마커 때문만이 아니다 — B2의 거리순 정렬이 이 값을 쓴다.
 */
export type LocateStatus = "idle" | "locating" | "ready" | "denied" | "failed";

export interface Coords {
  lat: number;
  lng: number;
}

/** 사용자가 조치할 수 있는 말로만 적는다 (DESIGN.md — 기술 용어 노출 금지) */
export const LOCATE_MESSAGE: Record<LocateStatus, string | undefined> = {
  idle: undefined,
  locating: "현재 위치를 찾는 중입니다",
  ready: undefined,
  denied: "위치 권한이 꺼져 있어 현재 위치를 쓸 수 없습니다",
  failed: "현재 위치를 확인하지 못했습니다",
};

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  /* 30초 안에 받은 값이면 재측정하지 않는다 — 걸어 다니는 속도에서 충분하다 */
  maximumAge: 30_000,
};

export function useCurrentPosition(map: naver.maps.Map | null) {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<LocateStatus>("idle");
  const markerRef = useRef<naver.maps.Marker | null>(null);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("failed");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setStatus("ready");
      },
      (error) => {
        console.error(`[현재 위치] ${error.code} ${error.message}`);
        setStatus(error.code === error.PERMISSION_DENIED ? "denied" : "failed");
      },
      GEOLOCATION_OPTIONS,
    );
  }, []);

  /* 좌표가 잡히면 마커를 놓고 그쪽으로 이동한다. 위험 핀과 섞이지 않게 모양을 달리한다. */
  useEffect(() => {
    if (!map || !coords) return;
    const position = new naver.maps.LatLng(coords.lat, coords.lng);

    markerRef.current ??= new naver.maps.Marker({
      map,
      position,
      icon: {
        content: `<div class="size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-brand shadow-e2"></div>`,
      },
      // 위험 핀(zIndex = 점수, 최대 100) 위에 오게 한다 — 내 위치가 가려지면 쓸모가 없다
      zIndex: 1000,
    });
    markerRef.current.setPosition(position);
    map.panTo(position);

    return () => {
      markerRef.current?.setMap(null);
      markerRef.current = null;
    };
  }, [map, coords]);

  return { coords, status, locate, message: LOCATE_MESSAGE[status] };
}

/** 두 좌표 사이 거리(m) — SDK가 제공하는 계산을 쓴다. 직접 구현하면 좌표계를 또 다루게 된다. */
export function distanceMeters(from: Coords, to: Coords): number {
  return naver.maps.EPSG3857.getDistance(
    new naver.maps.LatLng(from.lat, from.lng),
    new naver.maps.LatLng(to.lat, to.lng),
  );
}
