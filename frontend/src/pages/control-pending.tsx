/**
 * 아직 실장되지 않은 관제 탭의 자리.
 *
 * 탭 골격을 1단계에 세우면서 나머지 넷이 빈 화면으로 남는 것을 막는다.
 * `EmptyState`를 쓰지 않는 이유는 그쪽이 '다음 행동 1개'를 전제하는데 여기엔 할 행동이 없어서다.
 * 탭이 실장되면 사용처가 하나씩 줄고, 마지막에 파일째 지운다.
 */
export default function ControlPendingPage({ tab }: { tab: string }) {
  return (
    <section
      aria-label={tab}
      className="flex h-full items-center justify-center rounded-md border border-hairline bg-surface"
    >
      <p className="text-body-md text-body">{tab}은 아직 준비 중입니다</p>
    </section>
  );
}
