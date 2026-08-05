import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/api/client";

/**
 * 조회 훅 — 서버 상태 라이브러리를 들이지 않고 필요한 만큼만 만든다.
 *
 * 화면 진입 시 1회 조회가 대부분이고 쿼리가 6종뿐이라 캐시·무효화 계층이 필요 없다.
 * 대신 손으로 만들 때 틀리기 쉬운 두 가지를 여기서 한 번만 처리한다:
 * - **경합** — 동을 빠르게 바꾸면 먼저 보낸 응답이 나중에 도착해 화면을 되돌린다. AbortController로 끊는다.
 * - **깜빡임** — 재조회 중에도 직전 데이터를 들고 있어 목록이 비었다가 다시 차지 않는다(CLS 0).
 */
export interface QueryResult<T> {
  data: T | undefined;
  error: ApiError | undefined;
  loading: boolean;
  reload: () => void;
}

interface State<T> {
  data: T | undefined;
  error: ApiError | undefined;
  loading: boolean;
}

/**
 * @param key 조회를 다시 돌릴 기준. **null이면 조회하지 않는다**(선행 선택 대기 등).
 * @param fetcher key가 바뀔 때만 다시 불린다 — 매 렌더 새로 만들어도 된다.
 */
export function useApiQuery<T>(
  key: string | null,
  fetcher: (signal: AbortSignal) => Promise<T>,
): QueryResult<T> {
  // 렌더마다 새로 만들어지는 클로저를 deps에 넣지 않기 위한 우회 — 재조회 기준은 key 하나다.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const [state, setState] = useState<State<T>>({
    data: undefined,
    error: undefined,
    loading: key !== null,
  });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (key === null) {
      setState({ data: undefined, error: undefined, loading: false });
      return;
    }
    const controller = new AbortController();
    setState((prev) => ({ ...prev, loading: true, error: undefined }));

    fetcherRef.current(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ data, error: undefined, loading: false });
      },
      (e: unknown) => {
        if (controller.signal.aborted) return;
        const error =
          e instanceof ApiError ? e : new ApiError("UNKNOWN", "요청을 처리하지 못했습니다.", 0);
        setState({ data: undefined, error, loading: false });
      },
    );

    return () => controller.abort();
  }, [key, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}
