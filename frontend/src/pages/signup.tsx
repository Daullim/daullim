import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthCard } from "@/components/layout/auth-card";
import { Button } from "@/components/core/button";
import { TextField } from "@/components/core/text-field";

/** 010-1234-5678 — 숫자만 남기고 11자리까지 하이픈 삽입 */
function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

/**
 * 회원가입 — 로그인과 같은 카드 셸. 백엔드가 없어 제출은 목업(저장 없음)이다.
 * 비밀번호 확인은 오타를 잡는 유일한 장치라 필수로 둔다.
 */
export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    userId: "",
    password: "",
    passwordConfirm: "",
    name: "",
    phone: "",
    birth: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const mismatch = form.passwordConfirm !== "" && form.password !== form.passwordConfirm;
  const filled =
    form.userId.trim() !== "" &&
    form.password !== "" &&
    form.passwordConfirm !== "" &&
    form.name.trim() !== "" &&
    form.phone.replace(/\D/g, "").length >= 10 &&
    form.birth !== "";
  const canSubmit = filled && !mismatch;

  return (
    <AuthCard
      title="회원가입"
      footer={
        <>
          이미 계정이 있으신가요?{" "}
          <Link to="/login" className="text-brand">
            로그인
          </Link>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!canSubmit) return;

          try {
            const response = await fetch("http://localhost:8080/api/v1/auth/signup", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                loginId: form.userId.trim(),
                password: form.password,
                name: form.name.trim(),
                phone: form.phone,
                birthOn: form.birth,
              }),
            });

            const result = await response.json();

            if (!response.ok) {
              throw new Error(result.message ?? "회원가입에 실패했습니다.");
            }

            navigate("/login");
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "회원가입에 실패했습니다.";

            alert(message);
          }
        }}
      >
        <TextField
          id="signup-id"
          label="아이디"
          value={form.userId}
          onChange={(e) => set("userId", e.target.value)}
          autoComplete="username"
          placeholder="사용할 아이디"
        />
        <TextField
          id="signup-pw"
          label="비밀번호"
          type="password"
          value={form.password}
          onChange={(e) => set("password", e.target.value)}
          autoComplete="new-password"
          placeholder="비밀번호"
        />
        <TextField
          id="signup-pw2"
          label="비밀번호 확인"
          type="password"
          value={form.passwordConfirm}
          onChange={(e) => set("passwordConfirm", e.target.value)}
          autoComplete="new-password"
          placeholder="비밀번호 재입력"
          error={mismatch ? "비밀번호가 일치하지 않습니다" : undefined}
        />
        <TextField
          id="signup-name"
          label="이름"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          autoComplete="name"
          placeholder="실명"
        />
        <TextField
          id="signup-phone"
          label="전화번호"
          type="tel"
          inputMode="numeric"
          value={form.phone}
          onChange={(e) => set("phone", formatPhone(e.target.value))}
          autoComplete="tel"
          placeholder="010-0000-0000"
        />
        <TextField
          id="signup-birth"
          label="생년월일"
          type="date"
          value={form.birth}
          onChange={(e) => set("birth", e.target.value)}
          autoComplete="bday"
        />

        <Button type="submit" variant="primary" size="field-lg" className="w-full" disabled={!canSubmit}>
          가입하기
        </Button>
      </form>
    </AuthCard>
  );
}
