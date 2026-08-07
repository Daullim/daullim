import { useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

/**
 * 현장모드에서 들어온 곁길 화면(기록 조회·설정)의 나가기 동작.
 *
 * 드로어가 붙여 준 `?from=field`가 있을 때만 핸들러를 돌려준다 — 관제에서 들어왔으면
 * undefined라 상단바에 X가 붙지 않는다. 나가면 현장 화면으로 되돌아간다.
 */
export function useFieldExit(): (() => void) | undefined {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const fromField = params.get("from") === "field";

  const exit = useCallback(() => navigate("/field"), [navigate]);
  return fromField ? exit : undefined;
}
