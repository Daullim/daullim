/**
 * 액세스 토큰 보관 — 계정·비밀번호는 어떤 형태로도 저장하지 않는다(lib/prefs.ts와 같은 원칙).
 *
 * 토큰은 localStorage에 둔다. 태블릿 현장모드는 화면을 종일 켜 두고 새로고침이 잦은데,
 * 메모리에만 들고 있으면 새로고침 한 번에 점검 중 로그아웃된다. TTL은 서버가 1시간으로 강제한다.
 *
 * 사파리 프라이빗 모드 등에서 storage 접근이 던질 수 있어 전부 try/catch.
 */
const TOKEN_KEY = "daullim.accessToken";

export function loadToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    /* storage 차단 — 비로그인으로 진행 */
    return null;
  }
}

export function saveToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* 저장 실패해도 이번 세션 호출은 동작한다 */
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* 지우지 못해도 만료 토큰은 서버가 401로 막는다 */
  }
}
