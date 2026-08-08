/**
 * 외부 지도 길찾기 링크 — 네이버 지도.
 *
 * 화면의 지도가 Naver Maps라 길찾기도 같은 서비스로 통일한다(ADR-004 v1.8).
 * 딥링크는 **API가 아니라 URL 규약**이라 키도 SDK도 네트워크 호출도 없다 — §2의 "외부 API 의존 0"은 유지된다.
 *
 * ⚠️ **앱 스킴(`nmap://route/...`)을 쓰지 않는다.** 네이버가 공식 문서화한 길찾기 연동은 그 스킴뿐이지만,
 * 앱이 없으면 아무 일도 일어나지 않아 "눌러도 반응 없는 버튼"이 된다 — 이 버튼이 원래 그랬고 그걸 고치는 중이다.
 * 데스크톱 시연에서도 열려야 하므로 웹 URL을 쓴다. 대신 이 주소는 네이버 지도 웹앱의 내부 URL이라
 * **공개 규약이 아니고 예고 없이 바뀔 수 있다.** 길찾기가 엉뚱한 화면을 열면 여기부터 본다.
 */
const NAVER_DIRECTIONS = "https://map.naver.com/p/directions";

/** 자동차 경로. 점검원은 차로 이동한다. */
const MODE = "car";

/**
 * 목적지까지의 경로 URL.
 *
 * ⚠️ 좌표는 **경도,위도 순서**다 — 카카오(`위도,경도`)와 반대라 바꿔 넣으면 엉뚱한 곳으로 간다.
 * 출발지는 `-`로 비워 네이버가 현재 위치를 잡게 한다.
 */
export function routeToUrl(destination: {
  address: string;
  lat: number;
  lng: number;
}): string {
  // 이름에 쉼표가 있으면 좌표 구분자로 오해된다.
  const name = encodeURIComponent(destination.address.replace(/,/g, " "));
  return `${NAVER_DIRECTIONS}/-/${destination.lng},${destination.lat},${name}/-/${MODE}`;
}

/** 새 탭으로 연다 — 점검 중인 화면을 대체하면 폼 입력이 날아간다. */
export function openRoute(destination: { address: string; lat: number; lng: number }): void {
  window.open(routeToUrl(destination), "_blank", "noopener,noreferrer");
}
