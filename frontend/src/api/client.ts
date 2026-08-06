import { clearToken, loadToken } from "@/api/token";

/**
 * API 호출 한 곳 — 공통 봉투 해제와 토큰 부착이 여기서만 일어난다.
 *
 * 개발에서는 vite dev 서버가 `/api`를 백엔드로 프록시하므로 기본 베이스가 상대경로다(CORS 없음).
 * 배포에서 오리진이 갈리면 `VITE_API_BASE`로 절대주소를 준다.
 */
const BASE = import.meta.env.VITE_API_BASE ?? "/api/v1";

/** 서버가 내려준 에러 코드를 그대로 들고 다닌다 — 화면이 401·403·409를 구분해야 한다. */
export class ApiError extends Error {
  /* 생성자 파라미터 프로퍼티는 erasableSyntaxOnly가 막는다 — 필드를 따로 둔다 */
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

/** 네트워크 자체가 안 될 때 — 화면은 이걸 "연결 실패"로 표시한다 */
export const NETWORK_ERROR_CODE = "NETWORK_ERROR";

/**
 * 세션 만료 통지
 */
type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

interface Envelope<T> {
  code: string;
  message: string;
  data: T;
}

function authHeaders(): HeadersInit {
  const token = loadToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function send(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(`${BASE}${path}`, init);
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError(NETWORK_ERROR_CODE, "서버에 연결할 수 없습니다.", 0);
  }
}

/**
 * 실패 응답을 ApiError로.
 *
 * **HTTP 상태 텍스트를 그대로 message에 담지 않는다.** 화면이 그 값을 사용자에게 보이는데
 * "Bad Gateway" 같은 문자열은 조치로 이어지지 않고, 필드 옆에 붙으면 입력이 틀린 것처럼 읽힌다
 * (DESIGN.md — 기술 용어 노출 금지). 원문은 콘솔로 보내 개발자만 본다.
 */
async function toError(res: Response): Promise<ApiError> {
  if (res.status === 401) {
    // 토큰을 들고 갔는데 거절당했으면 만료다. 없이 갔으면 로그인 시도 실패라 화면을 옮기지 않는다.
    const sessionExpired = loadToken() !== null;
    clearToken();
    if (sessionExpired) unauthorizedHandler?.();
  }

  let code = "UNKNOWN";
  let serverMessage: string | undefined;
  try {
    const body = (await res.json()) as Partial<Envelope<unknown>>;
    code = body.code ?? code;
    serverMessage = body.message;
  } catch {
    /* 봉투가 아니다 — 프록시·게이트웨이가 HTML이나 빈 본문을 돌려준 경우 */
  }

  // 서버가 우리 봉투로 답했으면 그 문구는 사용자용으로 쓰라고 만든 것이다.
  if (serverMessage) return new ApiError(code, serverMessage, res.status);

  console.error(`[API] ${res.status} ${res.statusText || "(상태 텍스트 없음)"} — ${res.url}`);
  return new ApiError(code, fallbackMessage(res.status), res.status);
}

/** 봉투가 없을 때의 사용자 문구 — 원인을 아는 만큼만 말한다. */
function fallbackMessage(status: number): string {
  if (status === 502 || status === 503 || status === 504) {
    return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.";
  }
  if (status >= 500) return "서버에 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
  return "요청을 처리하지 못했습니다.";
}

/** 공통 봉투를 벗겨 data만 돌려준다. */
export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await send(path, { headers: authHeaders(), signal });
  if (!res.ok) throw await toError(res);
  return ((await res.json()) as Envelope<T>).data;
}

export async function apiSend<T>(
  method: "POST" | "PATCH",
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const res = await send(path, {
    method,
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw await toError(res);
  return ((await res.json()) as Envelope<T>).data;
}

/** GeoJSON은 봉투로 감싸지 않는다 — 표준 문서 형식 그대로 온다. */
export async function apiGetRaw<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await send(path, { headers: authHeaders(), signal });
  if (!res.ok) throw await toError(res);
  return (await res.json()) as T;
}

/** 쿼리스트링 조립 — undefined·빈 문자열은 보내지 않는다. */
export function query(params: Record<string, string | number | undefined | null>): string {
  const usable = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
  if (usable.length === 0) return "";
  return `?${usable.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&")}`;
}
