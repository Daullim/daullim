/**
 * Naver Maps JS API v3
 *
 * `@types/navermaps`를 들이지 않은 이유는 지금 닿는 면이 지도 생성·크기 조정뿐이기 때문이다.
 * **격자 레이어(`Data`)와 마커가 붙는 단계에서 면적이 커지면 그때 도입 여부를 다시 정한다**
 * — 손으로 쓴 선언이 틀리면 타입이 거짓말을 하므로, 넓어지는 순간 직접 선언을 고집할 이유가 없다.
 */
declare namespace naver.maps {
  class LatLng {
    constructor(lat: number, lng: number);
    lat(): number;
    lng(): number;
  }

  class Size {
    constructor(width: number, height: number);
  }

  /** 값은 문자열 상수다 — `config/domain.ts`의 `MAP_TYPE` 키와 1:1로 맞춰 둔다. */
  const MapTypeId: {
    readonly NORMAL: string;
    readonly SATELLITE: string;
    readonly TERRAIN: string;
  };

  interface MapOptions {
    center?: LatLng;
    zoom?: number;
    mapTypeId?: string;
    /** 기본 UI를 전부 끈다 — 줌·현재 위치는 우리 플로팅 컨트롤이 맡는다 */
    zoomControl?: boolean;
    logoControl?: boolean;
    mapDataControl?: boolean;
    scaleControl?: boolean;
  }

  class Map {
    constructor(element: HTMLElement | string, options?: MapOptions);
    setSize(size: Size): void;
    setCenter(center: LatLng): void;
    setZoom(zoom: number, useEffect?: boolean): void;
    getZoom(): number;
    setMapTypeId(mapTypeId: string): void;
    destroy(): void;
  }
}

interface Window {
  naver?: typeof naver;
  /** SDK가 인증에 실패하면 부르는 전역 훅 — 정의해 두지 않으면 지도만 조용히 비어 있다 */
  navermap_authFailure?: () => void;
}
