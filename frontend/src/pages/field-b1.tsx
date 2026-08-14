import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TopBar } from "@/components/layout/top-bar";
import { Legend } from "@/components/layout/legend";
import { MapCanvas } from "@/components/layout/map-canvas";
import { Button } from "@/components/core/button";
import { DataText } from "@/components/core/data-text";
import { RiskBadge } from "@/components/core/risk-badge";
import { RegionSelector, type RegionValue } from "@/components/core/region-selector";
import { EmptyState, ErrorInline, RowSkeleton } from "@/components/core/system-states";
import { getAdminDongBoundaries, getDongs, getSigungus } from "@/api/queries";
import { REGION_CENTER, fitBoundsWithin, type MapInset } from "@/lib/naver-maps";
import { useApiQuery } from "@/api/use-api-query";
import {
  adminBoundaryStyles,
  boundsOfAdminBoundary,
  filterToDong,
  filterToSigungu,
} from "@/lib/admin-boundary-layer";
import { cn } from "@/lib/utils";

/**
 * 아키타입 B1 — /field 동 선택 (드릴다운 1/3). 전면 지도 + 플로팅 오버레이.
 * 하단은 구 내 동 전체 카드 가로 스크롤(평균 위험도 내림차순) —
 * 카드 탭=선택(셀렉터·지도 연동), 카드 내 버튼=진입.
 */
export default function FieldDongPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [region, setRegion] = useState<RegionValue>(() => {
    const dong = params.get("dongCd");
    return dong ? { sido: dong.slice(0, 2), sigungu: dong.slice(0, 5), dong } : {};
  });
  const [map, setMap] = useState<naver.maps.Map | null>(null);
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());
  const stripRef = useRef<HTMLDivElement>(null);
  const topOverlayRef = useRef<HTMLDivElement>(null);

  /**
   * 지도는 플로팅 오버레이 **뒤까지** 그려진다 — 그대로 맞추면 경계 아래쪽이 동 카드에 가려 잘린다.
   * 오버레이가 먹는 두께를 재 그만큼 비우면 경계가 그 사이 띠에 꽉 차게 들어온다.
   *
   * 두께는 맞출 때마다 실측한다 — 카드는 내용에 따라, 셀렉터 줄은 좁은 폭에서 줄바꿈으로 변한다.
   * 상태가 아니라 ref로 읽는 건 의도다: 두께가 바뀔 때마다 다시 맞추면 점검원이 끌어 둔 시점이 튄다.
   */
  const mapInset = useCallback((): MapInset => {
    const gap = 12; // 경계선이 카드에 닿지 않게 남기는 틈 — 오버레이의 top-3·inset-x-3과 같은 값
    return {
      top: (topOverlayRef.current?.offsetHeight ?? 0) + gap * 2, // 띄운 간격 + 높이 + 틈
      right: gap,
      bottom: (stripRef.current?.offsetHeight ?? 0) + gap, // 카드 줄은 bottom-0에 붙어 있다
      left: gap,
    };
  }, []);

  const sigungus = useApiQuery(region.sido ? `sigungus:${region.sido}` : null, (s) =>
    getSigungus(region.sido!, s),
  );
  const dongs = useApiQuery(region.sigungu ? `dongs:${region.sigungu}` : null, (s) =>
    getDongs(region.sigungu!, s),
  );
  const boundaries = useApiQuery("adminDongBoundaries", (s) => getAdminDongBoundaries(s));

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

  /** 선택한 시군구의 행정동 경계만 지도에 올린다 */
  const sigunguBoundaries = useMemo(() => {
    if (!region.sigungu || !boundaries.data) return null;
    return filterToSigungu(boundaries.data, region.sigungu);
  }, [boundaries.data, region.sigungu]);

  const selectedBoundary = useMemo(() => {
    if (!region.dong || !sigunguBoundaries) return null;
    return filterToDong(sigunguBoundaries, region.dong);
  }, [region.dong, sigunguBoundaries]);

  /* 시군구가 바뀌면 해당 구/군의 행정동 경계를 전부 얹고 전체가 보이게 맞춘다 */
  useEffect(() => {
    if (!map || !sigunguBoundaries?.features.length) return;

    map.data.setStyle(adminBoundaryStyles().base);
    map.data.addGeoJson(sigunguBoundaries, false);

    const bounds = boundsOfAdminBoundary(sigunguBoundaries);
    if (bounds) fitBoundsWithin(map, bounds, mapInset());

    return () => map.data.removeGeoJson(sigunguBoundaries);
  }, [map, sigunguBoundaries, mapInset]);

  /* 지도 → 카드/셀렉터: 경계 폴리곤을 누르면 그 동이 선택된다 */
  useEffect(() => {
    if (!map) return;
    const listener = map.data.addListener("click", (e: naver.maps.FeatureEvent) => {
      const dongCd = e.feature.getProperty("dong_cd");
      if (typeof dongCd === "string") {
        setRegion((current) => ({ ...current, dong: dongCd }));
      }
    });
    return () => map.data.removeListener(listener);
  }, [map]);

  /* 카드/셀렉터 → 지도: 선택된 동만 더 진하게 강조하고 경계에 맞춰 내려앉는다 */
  useEffect(() => {
    if (!map || !sigunguBoundaries?.features.length) return;
    const { selected: selectedStyle } = adminBoundaryStyles();

    for (const feature of map.data.getAllFeature()) {
      map.data.revertStyle(feature);
      if (region.dong && feature.getProperty("dong_cd") === region.dong) {
        map.data.overrideStyle(feature, selectedStyle);
      }
    }

    if (!region.dong || !selectedBoundary?.features.length) return;

    const bounds = boundsOfAdminBoundary(selectedBoundary);
    if (bounds) fitBoundsWithin(map, bounds, mapInset());
  }, [map, region.dong, selectedBoundary, sigunguBoundaries, mapInset]);

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
          onMapReady={setMap}
          className="h-full rounded-none border-none"
        />

        {/* 상단 플로팅 줄 — 지역 셀렉터 + 범례 (모바일은 줄바꿈) */}
        <div
          ref={topOverlayRef}
          className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap items-start justify-between gap-2"
        >
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
