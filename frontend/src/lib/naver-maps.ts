import type { MapType } from "@/config/domain";

/**
 * Naver Maps SDK 로더 (ADR-004 §2).
 *
 * `index.html`에 스크립트를 박지 않고 필요한 화면에서 부른다 — `/login`·`/signup`은 지도가 없는데
 * 매 진입마다 SDK를 받을 이유가 없다. 여러 화면이 동시에 불러도 **스크립트는 한 벌만** 붙는다.
 */
const CLIENT_ID = import.meta.env.VITE_NAVER_MAP_CLIENT_ID;

/** 파라미터 이름은 `ncpKeyId`다 — 구 자료에 흔한 `ncpClientId`로는 인증되지 않는다. */
const SRC = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${CLIENT_ID}`;

/** 키가 없으면 조용한 회색 화면 대신 이 사유를 화면에 띄운다 */
export const MISSING_KEY_MESSAGE =
  "지도 키가 설정되지 않았습니다. frontend/.env의 VITE_NAVER_MAP_CLIENT_ID를 확인하세요.";
export const LOAD_FAILED_MESSAGE = "지도를 불러오지 못했습니다. 네트워크 연결을 확인하세요.";

/**
 * 인증 실패는 **스크립트 로드 성공 이후에** 따로 온다 — 로드만 보고 있으면 지도가 조용히 빈 채로 남는다.
 * 현재 주소를 문구에 담는다: 실패 원인 1순위가 이 주소가 콘솔에 등록되지 않은 것이고,
 * vite 가 5173 을 못 잡으면 매번 포트가 달라져 무엇을 등록해야 하는지 화면에서 바로 보여야 한다.
 */
export function authFailureMessage(): string {
  return `지도 인증에 실패했습니다. 네이버 콘솔의 Web 서비스 URL에 ${window.location.origin} 이(가) 등록돼 있는지 확인하세요.`;
}

let loading: Promise<void> | null = null;
let authFailed = false;
const authFailureListeners = new Set<() => void>();

/** SDK가 부르는 전역 훅을 모듈 적재 시점에 걸어 둔다 — 지도 생성보다 먼저 와도 놓치지 않게. */
if (typeof window !== "undefined") {
  window.navermap_authFailure = () => {
    authFailed = true;
    authFailureListeners.forEach((listener) => listener());
  };
}

/** 이미 실패한 뒤에 구독해도 즉시 알린다 — 화면 전환으로 늦게 붙는 지도가 있다. */
export function onAuthFailure(listener: () => void): () => void {
  if (authFailed) listener();
  authFailureListeners.add(listener);
  return () => authFailureListeners.delete(listener);
}

export function loadNaverMaps(): Promise<void> {
  if (!CLIENT_ID) return Promise.reject(new Error(MISSING_KEY_MESSAGE));
  if (window.naver?.maps) return Promise.resolve();

  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // 실패한 약속을 남겨두면 재시도가 영영 막힌다
      loading = null;
      script.remove();
      reject(new Error(LOAD_FAILED_MESSAGE));
    };
    document.head.appendChild(script);
  });

  return loading;
}

/**
 * 시연 유니버스 중심 — 좌표가 없는 화면(B1)의 초기 시점.
 *
 * `buildings` 전수 평균이라 지어낸 값이 아니다. 실제 데이터가 있는 화면은 그 좌표로 다시
 * 잡으므로 여기는 첫 프레임용이다.
 *
 * **ADR-010 시연 지역과 1:1로 맞춘다** — 빠뜨린 시군구는 관악구에서 시작해 경계가 잡힐 때까지
 * 엉뚱한 곳을 비춘다. 값은 `select avg(lat), avg(lng) from buildings group by sigungu_cd`.
 */
export const REGION_CENTER: Record<string, { lat: number; lng: number }> = {
  "11305": { lat: 37.631288, lng: 127.021939 }, // 강북구 20,665건
  "11620": { lat: 37.479085, lng: 126.936807 }, // 관악구 22,501건
  "26230": { lat: 35.161019, lng: 129.049349 }, // 부산진구 21,073건
  "26710": { lat: 35.28741, lng: 129.216148 }, // 기장군 10,137건
  "52750": { lat: 35.594047, lng: 127.250127 }, // 임실군 8,092건
  "52790": { lat: 35.450206, lng: 126.627922 }, // 고창군 11,772건
};

export const DEFAULT_CENTER = REGION_CENTER["11620"];

/** 지도 위 플로팅 오버레이가 가리는 가장자리 두께(px). */
export interface MapInset {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export function fitBoundsWithin(
  map: naver.maps.Map,
  bounds: naver.maps.LatLngBounds,
  inset: MapInset,
): void {
  const size = map.getSize();
  const bandWidth = size.width - inset.left - inset.right;
  const bandHeight = size.height - inset.top - inset.bottom;

  // 오버레이가 지도를 다 덮을 만큼 좁으면 띠가 성립하지 않는다 — 가림을 감수하고 전체에 맞춘다
  if (bandWidth <= 0 || bandHeight <= 0) {
    map.fitBounds(bounds);
    return;
  }

  /* 지금 줌에서의 픽셀 크기를 재고 배율만큼 줌을 올린다(한 단계 = 2배).
     시작 줌과 무관하게 같은 결과가 나오는 걸 확인했다(줌 9·16에서 동일). */
  const projection = map.getProjection();
  const sw = projection.fromCoordToOffset(bounds.getSW());
  const ne = projection.fromCoordToOffset(bounds.getNE());
  const width = Math.abs(ne.x - sw.x) || 1;
  const height = Math.abs(sw.y - ne.y) || 1;

  map.setZoom(
    Math.floor(map.getZoom() + Math.log2(Math.min(bandWidth / width, bandHeight / height))),
  );
  map.setCenter(bounds.getCenter());
  // 뷰포트 중앙에 놓인 경계를 띠 중앙으로 올린다. 세 호출 모두 즉시 반영된다(대기 불필요).
  map.panBy(new naver.maps.Point(0, size.height / 2 - (inset.top + bandHeight / 2)));
}

/**
 * 화면 설정값(`MAP_TYPE`) → SDK `mapTypeId`.
 *
 * **변환이 없다.** SDK의 `MapTypeId`가 `"normal"`·`"satellite"`·`"terrain"` 소문자 리터럴이라
 * `MAP_TYPE` 키와 이미 같은 값이다(`domain.ts` 주석의 "1:1"이 문자열 수준에서도 성립).
 * 타입만 좁혀 잘못된 키가 들어오는 것을 막는다.
 */
export function toMapTypeId(mapType: MapType): naver.maps.MapTypeIdLiteral {
  return mapType;
}
