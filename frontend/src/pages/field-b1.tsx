import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/layout/top-bar";
import { Legend } from "@/components/layout/legend";
import { MapPlaceholder } from "@/components/layout/map-placeholder";
import { Button } from "@/components/core/button";
import { DataText } from "@/components/core/data-text";
import { RiskBadge } from "@/components/core/risk-badge";
import { RegionSelector, type RegionValue } from "@/components/core/region-selector";
import { DONG, DONG_SUMMARY, RURAL_SIGUNGU, SIGUNGU } from "@/mock/sample";
import { cn } from "@/lib/utils";

/**
 * 아키타입 B1 — /field 동 선택 (드릴다운 1/3). 전면 지도 + 플로팅 오버레이.
 * 하단은 구 내 동 전체 카드 가로 스크롤(평균 위험도 내림차순) —
 * 카드 탭=선택(셀렉터·지도 연동), 카드 내 버튼=진입.
 */
export default function FieldDongPage() {
  const navigate = useNavigate();
  const [region, setRegion] = useState<RegionValue>({
    sido: "seoul",
    sigungu: "gwanak",
    dong: "eunhcheon",
  });
  const isRural = region.sigungu ? RURAL_SIGUNGU.has(region.sigungu) : false;
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());
  const stripRef = useRef<HTMLDivElement>(null);

  /* 드롭다운·카드 탭 어느 쪽이든 선택된 동 카드가 가운데 오도록 스크롤.
     브라우저는 새 스크롤(예: Select 닫힘 시 포커스 복원)이 시작되면 진행 중인
     스무스 스크롤을 취소하므로, 복원이 끝난 뒤로 지연시킨다. */
  useEffect(() => {
    const timer = setTimeout(() => {
      const strip = stripRef.current;
      const card = region.dong ? cardRefs.current.get(region.dong) : undefined;
      if (!strip || !card) return;
      /* smooth 스크롤이 비활성인 환경(reduced-motion 등)에서도 확실히
         도달하도록 즉시 이동으로 고정 */
      strip.scrollLeft =
        card.offsetLeft - (strip.clientWidth - card.offsetWidth) / 2;
    }, 300);
    return () => clearTimeout(timer);
  }, [region.dong]);

  const sigunguLabel = region.sido
    ? SIGUNGU[region.sido]?.find((o) => o.value === region.sigungu)?.label
    : undefined;
  const dongLabel = region.sigungu
    ? DONG[region.sigungu]?.find((o) => o.value === region.dong)?.label
    : undefined;

  const dongCards = (region.sigungu ? (DONG[region.sigungu] ?? []) : [])
    .map((d) => ({ ...d, summary: DONG_SUMMARY[d.value] }))
    .filter((d) => d.summary)
    .sort((a, b) => b.summary.avgRisk.score - a.summary.avgRisk.score);

  const enterDong = (dong: string) => {
    setRegion({ ...region, dong });
    navigate(isRural ? "/field/units?rural=1" : "/field/grid");
  };

  return (
    <div className="flex h-dvh flex-col">
      <TopBar mode="field" crumbs={[{ label: "점검할 동 선택" }]} />

      {/* 전면 지도 — 오버레이는 전부 플로팅 (인라인 메뉴 줄 금지) */}
      <main className="relative min-h-0 flex-1">
        <MapPlaceholder
          label={dongLabel ? `${dongLabel} — 동 경계` : "동을 선택하세요"}
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
          className="absolute inset-x-0 bottom-0 flex snap-x gap-3 overflow-x-auto p-3"
        >
          {dongCards.map((d) => {
            const selected = region.dong === d.value;
            return (
              <section
                key={d.value}
                ref={(el) => {
                  if (el) cardRefs.current.set(d.value, el);
                  else cardRefs.current.delete(d.value);
                }}
                className={cn(
                  "flex w-80 shrink-0 snap-start flex-col gap-3 rounded-md border bg-surface p-4 shadow-e2",
                  selected ? "border-brand bg-brand-tint" : "border-hairline",
                )}
              >
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setRegion({ ...region, dong: d.value })}
                  className="space-y-2 text-left"
                >
                  <h3 className="text-title text-ink">
                    {sigunguLabel} {d.label}
                  </h3>
                  <p className="flex items-baseline justify-between text-body-md text-body">
                    <span className="text-caption text-subtle">총 대상 가구 수</span>
                    <span>
                      <DataText>{d.summary.households}</DataText>가구
                    </span>
                  </p>
                  <p className="flex items-baseline justify-between text-body-md text-body">
                    <span className="text-caption text-subtle">도농 자동판별</span>
                    <span>{isRural ? "농촌" : "도시"}</span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span className="text-caption text-subtle">평균 위험도</span>
                    <RiskBadge
                      level={d.summary.avgRisk.level}
                      score={d.summary.avgRisk.score}
                    />
                  </p>
                </button>
                <Button
                  variant="primary"
                  size="field-xl"
                  className="w-full"
                  onClick={() => enterDong(d.value)}
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
