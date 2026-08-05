import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/layout/top-bar";
import { Legend } from "@/components/layout/legend";
import { MapCanvas } from "@/components/layout/map-canvas";
import { Button } from "@/components/core/button";
import { DataText } from "@/components/core/data-text";
import { RiskBadge } from "@/components/core/risk-badge";
import { RegionSelector, type RegionValue } from "@/components/core/region-selector";
import { EmptyState, ErrorInline, RowSkeleton } from "@/components/core/system-states";
import { getDongs, getSigungus } from "@/api/queries";
import { REGION_CENTER } from "@/lib/naver-maps";
import { useApiQuery } from "@/api/use-api-query";
import { cn } from "@/lib/utils";

/**
 * 아키타입 B1 — /field 동 선택 (드릴다운 1/3). 전면 지도 + 플로팅 오버레이.
 * 하단은 구 내 동 전체 카드 가로 스크롤(평균 위험도 내림차순) —
 * 카드 탭=선택(셀렉터·지도 연동), 카드 내 버튼=진입.
 */
export default function FieldDongPage() {
  const navigate = useNavigate();
  /* 값은 행정표준코드다. 빈 상태로 시작하고 셀렉터가 첫 시도·시군구를 채운다 */
  const [region, setRegion] = useState<RegionValue>({});
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());
  const stripRef = useRef<HTMLDivElement>(null);

  const sigungus = useApiQuery(region.sido ? `sigungus:${region.sido}` : null, (s) =>
    getSigungus(region.sido!, s),
  );
  const dongs = useApiQuery(region.sigungu ? `dongs:${region.sigungu}` : null, (s) =>
    getDongs(region.sigungu!, s),
  );

  const sigungu = sigungus.data?.find((r) => r.sigunguCd === region.sigungu);
  /* 도농은 시군구 대표값이다 — 격자 단계를 건너뛸지 정하는 화면 모드 분기 */
  const isRural = sigungu?.regionTypeCd === "RURAL";

  /* 드롭다운·카드 탭 어느 쪽이든 선택된 동 카드가 좌/우 이동 모션과 함께
     가운데로 오도록 스크롤. 네이티브 smooth(컴포지터 구동 — JS 부하와 무관하게
     부드러움, snap-center와 종착점 일치)를 쓰되:
     - 300ms 지연: Select 닫힘 시 포커스 복원 스크롤이 진행 중 smooth를 취소하는 문제 회피
     - 워치독: smooth 비활성 환경(reduced-motion 등)에서는 즉시 이동으로 도달 보장 */
  useEffect(() => {
    const strip = stripRef.current;
    const card = region.dong ? cardRefs.current.get(region.dong) : undefined;
    if (!strip || !card) return;
    const target = Math.max(
      0,
      Math.min(
        card.offsetLeft - (strip.clientWidth - card.offsetWidth) / 2,
        strip.scrollWidth - strip.clientWidth,
      ),
    );
    if (Math.abs(target - strip.scrollLeft) < 1) return;
    const startTimer = setTimeout(() => {
      strip.scrollTo({ left: target, behavior: "smooth" });
    }, 300);
    const watchdog = setTimeout(() => {
      if (Math.abs(strip.scrollLeft - target) > 1) strip.scrollLeft = target;
    }, 1100);
    return () => {
      clearTimeout(startTimer);
      clearTimeout(watchdog);
    };
  }, [region.dong]);

  const sigunguLabel = sigungu?.sigunguNm;
  const dongLabel = dongs.data?.find((d) => d.dongCd === region.dong)?.dongNm;

  /* 평균 위험도 내림차순 정렬은 화면 몫이다(서버는 코드순으로 준다) */
  const dongCards = [...(dongs.data ?? [])].sort((a, b) => b.avgRiskScore - a.avgRiskScore);

  /* 다음 화면은 URL의 dongCd만으로 지역을 복원한다 — 코드가 접두사 관계라 상위가 따라온다 */
  const enterDong = (dongCd: string) => {
    setRegion({ ...region, dong: dongCd });
    navigate(
      isRural ? `/field/units?dongCd=${dongCd}&rural=1` : `/field/grid?dongCd=${dongCd}`,
    );
  };

  return (
    <div className="flex h-dvh flex-col">
      <TopBar mode="field" crumbs={[{ label: "점검할 동 선택" }]} />

      {/* 전면 지도 — 오버레이는 전부 플로팅 (인라인 메뉴 줄 금지) */}
      <main className="relative min-h-0 flex-1">
        <MapCanvas
          ariaLabel={dongLabel ? `${dongLabel} 동 경계` : "점검할 동 선택"}
          center={region.sigungu ? REGION_CENTER[region.sigungu] : undefined}
          zoom={13}
          className="h-full rounded-none border-none"
        />

        {/* 상단 플로팅 줄 — 지역 셀렉터 + 범례 (모바일은 줄바꿈) */}
        <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap items-start justify-between gap-2">
          <div className="pointer-events-auto rounded-md border border-hairline bg-surface p-2 shadow-e1">
            <RegionSelector value={region} onChange={setRegion} density="field" />
          </div>
          <Legend className="pointer-events-auto" />
        </div>

        {/* 하단 — 구 내 동 카드 가로 스크롤 (평균 위험도 내림차순) */}
        <div
          ref={stripRef}
          className="absolute inset-x-0 bottom-0 flex snap-x gap-3 overflow-x-auto px-5 py-3 scroll-px-5"
        >
          {dongs.loading && !dongs.data && (
            <div className="w-64 shrink-0 rounded-md border border-hairline bg-surface p-3 shadow-e2">
              <RowSkeleton density="field" rows={2} />
            </div>
          )}
          {dongs.error && (
            <div className="w-full rounded-md border border-hairline bg-surface p-3 shadow-e2">
              <ErrorInline onRetry={dongs.reload} />
            </div>
          )}
          {!dongs.loading && !dongs.error && dongCards.length === 0 && (
            <div className="w-full rounded-md border border-hairline bg-surface shadow-e2">
              <EmptyState message="이 시·군·구의 산출 결과가 없습니다" onAction={dongs.reload} />
            </div>
          )}
          {dongCards.map((d) => {
            const selected = region.dong === d.dongCd;
            return (
              <section
                key={d.dongCd}
                ref={(el) => {
                  if (el) cardRefs.current.set(d.dongCd, el);
                  else cardRefs.current.delete(d.dongCd);
                }}
                className={cn(
                  "flex w-64 shrink-0 snap-center flex-col gap-3 rounded-md border bg-surface p-3 shadow-e2",
                  selected ? "border-brand bg-brand-tint" : "border-hairline",
                )}
              >
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setRegion({ ...region, dong: d.dongCd })}
                  className="space-y-2 text-left"
                >
                  <h3 className="text-title text-ink">
                    {sigunguLabel} {d.dongNm}
                  </h3>
                  <p className="flex items-baseline justify-between text-body-md text-body">
                    <span className="text-caption text-subtle">총 대상 가구 수</span>
                    <span>
                      <DataText>{d.householdCount.toLocaleString()}</DataText>가구
                    </span>
                  </p>
                  <p className="flex items-baseline justify-between text-body-md text-body">
                    <span className="text-caption text-subtle">도농 자동판별</span>
                    <span>{isRural ? "농촌" : "도시"}</span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span className="text-caption text-subtle">평균 위험도</span>
                    {d.avgRiskLevelCd && (
                      <RiskBadge level={d.avgRiskLevelCd} score={d.avgRiskScore} />
                    )}
                  </p>
                </button>
                <Button
                  variant="primary"
                  size="field-lg"
                  className="w-full"
                  onClick={() => enterDong(d.dongCd)}
                >
                  이 동 점검 시작
                </Button>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
