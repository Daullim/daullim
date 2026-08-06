/**
 * Naver Maps SDK 타입은 `@types/navermaps`가 제공한다 — 여기엔 그 패키지가 다루지 않는 것만 둔다.
 *
 * 직접 선언을 걷어낸 이유: 손으로 쓴 선언은 **틀려도 컴파일러가 잡아주지 못한다.**
 * 실제로 공식 문서가 클릭 리스너를 `addEventListener`로 설명하는데 런타임에는 `addListener`만
 * 존재했고(3단계), 그때 선언을 잘못 짚었다면 타입은 통과하고 런타임에서 터졌을 것이다.
 */
interface Window {
  /** SDK가 인증에 실패하면 부르는 전역 훅 — 정의해 두지 않으면 지도만 조용히 비어 있다 */
  navermap_authFailure?: () => void;
}
