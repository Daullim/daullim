import type * as React from "react";
import { Link } from "react-router-dom";

/**
 * 인증 화면 공용 셸 (로그인·회원가입) — 앱에서 유일하게 상단바 없는 중앙 카드 레이아웃.
 * 로고는 public/ 정적 자산이라 번들에 인라인되지 않는다.
 */
export function AuthCard({
  title,
  children,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center overflow-y-auto bg-canvas p-6">
      <main className="w-full max-w-100 rounded-md border border-hairline bg-surface p-6 shadow-e1">
        {/* 로고 + 한 줄 소개 — 아래 폼과 간격을 벌린다 */}
        <div className="flex flex-col items-center pt-4 pb-12">
          <Link to="/login" className="flex justify-center">
            <img
              src="/daullim-logo.png"
              alt="다울림"
              width={525}
              height={281}
              className="h-16 w-auto"
            />
          </Link>
          <p className="mt-3 text-center text-caption text-subtle">
            일반주택 대상 화재경보기 현장관리 및 AI 사후관제 시스템
          </p>
        </div>

        {/* 제목은 화면에서 빼되 문서 구조는 남긴다 — 스크린리더가 어느 화면인지 알아야 한다 */}
        <h1 className="sr-only">{title}</h1>

        {children}

        <p className="mt-5 text-center text-body-sm text-subtle">{footer}</p>
      </main>
    </div>
  );
}
