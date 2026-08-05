import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthCard } from "@/components/layout/auth-card";
import { Button } from "@/components/core/button";
import { TextField } from "@/components/core/text-field";
import { ApiError } from "@/api/client";
import { login } from "@/api/queries";
import { saveToken } from "@/api/token";

/**
 * 로그인 — 발급받은 액세스 토큰이 이후 모든 조회 API의 입장권이다.
 * 비밀번호는 이 컴포넌트 state 밖으로 나가지 않는다 — 저장·로깅 없이 요청 본문으로만 쓴다.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = userId.trim() !== "" && password !== "";

  return (
    <AuthCard
      title="로그인"
      footer={
        <>
          계정이 없으신가요?{" "}
          <Link to="/signup" className="text-brand">
            회원가입
          </Link>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!canSubmit || submitting) return;
          setError(undefined);
          setSubmitting(true);

          try {
            const { accessToken } = await login(userId.trim(), password);
            saveToken(accessToken);
            navigate("/control");
          } catch (caught) {
            /* 계정 존재 여부를 노출하지 않기 위해 서버가 401 하나로 답한다 */
            setError(
              caught instanceof ApiError && caught.status === 401
                ? "아이디 또는 비밀번호가 올바르지 않습니다."
                : caught instanceof ApiError
                  ? caught.message
                  : "로그인에 실패했습니다.",
            );
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <TextField
          id="login-id"
          label="아이디"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          autoComplete="username"
          placeholder="아이디를 입력하세요"
        />
        <TextField
          id="login-pw"
          label="비밀번호"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          error={error}
          placeholder="비밀번호를 입력하세요"
        />

        <Button
          type="submit"
          variant="primary"
          size="field-lg"
          className="w-full"
          disabled={!canSubmit || submitting}
        >
          {submitting ? "로그인 중..." : "로그인"}
        </Button>
      </form>
    </AuthCard>
  );
}
