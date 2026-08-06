import { MAP_TYPE, type MapType } from "@/config/domain";

/**
 * 사용자 설정 영속화 — 지도 유형 하나뿐이다.
 * 계정·비밀번호는 어떤 형태로도 저장하지 않는다.
 * 사파리 프라이빗 모드 등에서 storage 접근이 던질 수 있어 전부 try/catch.
 */
const MAP_TYPE_KEY = "daullim.mapType";
const MAP_TYPE_EVENT = "daullim:map-type";

export function loadMapType(): MapType {
  try {
    const v = localStorage.getItem(MAP_TYPE_KEY);
    if (v && v in MAP_TYPE) return v as MapType;
  } catch {
    /* storage 차단 — 기본값으로 진행 */
  }
  return "normal";
}

export function saveMapType(value: MapType): void {
  try {
    localStorage.setItem(MAP_TYPE_KEY, value);
  } catch {
    /* 저장 실패해도 화면 동작은 막지 않는다 */
  }
  window.dispatchEvent(new CustomEvent<MapType>(MAP_TYPE_EVENT, { detail: value }));
}

export function onMapTypeChange(listener: (value: MapType) => void): () => void {
  const handle = (event: Event) => {
    listener((event as CustomEvent<MapType>).detail);
  };
  window.addEventListener(MAP_TYPE_EVENT, handle);
  return () => window.removeEventListener(MAP_TYPE_EVENT, handle);
}
