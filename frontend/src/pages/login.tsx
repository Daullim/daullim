import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthCard } from "@/components/layout/auth-card";
import { Button } from "@/components/core/button";
import { TextField } from "@/components/core/text-field";

/**
 * 로그인 — 백엔드 인증이 없어(ADR-005에 인증 엔드포인트 없음) 형식만 확인하고 통과시킨다.
 * 비밀번호는 이 컴포넌트 state 밖으로 나가지 않는다 — 저장·전송·로깅 없음.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
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
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) navigate("/control");
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
          placeholder="비밀번호를 입력하세요"
        />

        <Button type="submit" variant="primary" size="field-lg" className="w-full" disabled={!canSubmit}>
          로그인
        </Button>
      </form>
    </AuthCard>
  );
}
