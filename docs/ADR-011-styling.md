# ADR-011: 스타일링 스택

Tailwind CSS v4 + shadcn/ui(Radix)를 채택하되, 디자인 값의 진실은 `frontend/src/styles/tokens.css` 한 곳에만 둔다 — shadcn CSS 변수(`--background`, `--primary` 등)는 DESIGN.md semantic 토큰의 별칭으로 연결하고, 컴포넌트는 semantic 토큰(Tailwind 유틸리티)만 참조하며 primitive hex를 직접 만지지 않는다.
