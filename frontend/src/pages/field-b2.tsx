import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TopBar } from "@/components/layout/top-bar";
import { Legend } from "@/components/layout/legend";
import { LocateButton } from "@/components/layout/locate-button";
import { MapCanvas } from "@/components/layout/map-canvas";
import { MapZoomControls } from "@/components/layout/map-zoom-controls";
import { MapSidePanel } from "@/components/layout/map-side-panel";
import { Button } from "@/components/core/button";
import { DataText } from "@/components/core/data-text";
import { RiskBadge } from "@/components/core/risk-badge";
import { HonestyLabel } from "@/components/core/honesty-label";
import { EmptyState, ErrorInline, RowSkeleton } from "@/components/core/system-states";
import { getGridSummary, getGrids } from "@/api/queries";
import { useApiQuery } from "@/api/use-api-query";
import { useRegionNames } from "@/api/use-region";
import type { GridFeatureProperties } from "@/api/types";
import { boundsOf, centerOf, filterToDong, gridStyles } from "@/lib/grid-layer";
import { distanceMeters, useCurrentPosition } from "@/lib/use-current-position";
import { cn } from "@/lib/utils";

/**
 * 격자 1행 — 정적 GeoJSON(경계·평균 점수)과 실시간 집계(대상·방문)를 `gridId`로 붙인 것.
 */
interface GridRow {
  gridId: string;
  targetCount: number;
  visitedCount: number;
  props?: GridFeatureProperties;
  /** 현재 위치에서 격자 중심까지(m). 위치를 못 잡았으면 null */
  distance: number | null;
}

/* 정렬 필터 — UI 로컬 개념 (도메인 열거값 아님) */
type GridSort = "risk" | "unvisited" | "distance";

const GRID_SORT: Record<GridSort, { label: string; compare: (a: GridRow, b: GridRow) => number }> = {
  risk: {
    label: "위험순",
    compare: (a, b) => (b.props?.avg_score ?? -1) - (a.props?.avg_score ?? -1),
  },
  unvisited: {
    label: "미방문 주택 많은 순",
    compare: (a, b) => b.targetCount - b.visitedCount - (a.targetCount - a.visitedCount),
  },
  distance: {
    label: "현재 위치 기준 거리순",
    /* 거리를 모르는 격자는 뒤로 — '모름'이 '가장 가까움'으로 둔갑하면 안 된다 */
    compare: (a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity),
  },
};

/**
 * 아키타입 B2 — /field 격자 선택 (드릴다운 2/3, 도시 전용).
 * 격자 위험 밀집 표시 방식은 결정 대기 — 지도는 "옅은 실선 경계"까지만
 * (DESIGN.md Known Gaps). 농촌 동은 이 단계를 건너뛰고 B3로 직행한다.
 */
export default function FieldGridPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const dongCd = params.get("dongCd") ?? undefined;
  const region = useRegionNames(dongCd);

  const [selected, setSelected] = useState<string | null>(null);
  const [sort, setSort] = useState<GridSort>("risk");
  const [map, setMap] = useState<naver.maps.Map | null>(null);
  const position = useCurrentPosition(map);

  /* 실시간 집계가 이 동에 어떤 격자가 있는지도 알려준다 — GeoJSON에는 행정동 속성이 없다 */
  const summary = useApiQuery(dongCd ? `gridSummary:${dongCd}` : null, (s) =>
    getGridSummary(dongCd!, s),
  );
  /* 정적 자산이라 한 번 받아 캐시된다(Cache-Control: max-age=86400) */
  const grids = useApiQuery("grids", (s) => getGrids(s));

  const propsById = useMemo(() => {
    const map = new Map<string, GridFeatureProperties>();
    for (const f of grids.data?.features ?? []) map.set(f.properties.grid_id, f.properties);
    return map;
  }, [grids.data]);

  /** 격자 중심 — 거리 계산용. GeoJSON이 있어야 구할 수 있다 */
  const centerById = useMemo(() => {
    const map = new Map<string, { lat: number; lng: number }>();
    for (const f of grids.data?.features ?? []) map.set(f.properties.grid_id, centerOf(f));
    return map;
  }, [grids.data]);

  const rows = useMemo(() => {
    const here = position.coords;
    return (summary.data ?? [])
      .map<GridRow>((g) => {
        const center = centerById.get(g.gridId);
        return {
          ...g,
          props: propsById.get(g.gridId),
          distance: here && center ? distanceMeters(here, center) : null,
        };
      })
      .sort(GRID_SORT[sort].compare);
  }, [summary.data, propsById, centerById, position.coords, sort]);

  const loading = summary.loading || grids.loading;
  const error = summary.error ?? grids.error;
  const current = selected ?? rows[0]?.gridId ?? null;

  /** 이 동의 격자만 추린 GeoJSON — 지도에 그릴 대상 */
  const dongGrids = useMemo(() => {
    if (!grids.data || !summary.data) return null;
    return filterToDong(grids.data, new Set(summary.data.map((g) => g.gridId)));
  }, [grids.data, summary.data]);

  /* 폴리곤을 지도에 얹는다. 격자 집합이 바뀔 때만 다시 그린다 — 선택 강조는 아래에서 따로 덮어쓴다. */
  useEffect(() => {
    if (!map || !dongGrids?.features.length) return;

    map.data.setStyle(gridStyles().base);
    // autoStyle=false — 스타일은 위 setStyle이 정한다
    map.data.addGeoJson(dongGrids, false);

    /* 동에 들어오면 격자 전체가 보이게 맞춘다 — center/zoom 추정보다 정확하다 */
    const bounds = boundsOf(dongGrids);
    if (bounds) map.fitBounds(bounds);

    return () => map.data.removeGeoJson(dongGrids);
  }, [map, dongGrids]);

  /* 지도 → 리스트: 격자를 누르면 그 행이 선택된다 */
  useEffect(() => {
    if (!map) return;
    const listener = map.data.addListener("click", (e: naver.maps.FeatureEvent) => {
      const gridId = e.feature.getProperty("grid_id");
      if (typeof gridId === "string") setSelected(gridId);
    });
    return () => map.data.removeListener(listener);
  }, [map]);

  /* 리스트 → 지도: 선택된 격자만 강조한다 */
  useEffect(() => {
    if (!map || !dongGrids?.features.length) return;
    const { selected: selectedStyle } = gridStyles();

    /* revertStyle은 피처 단위라 전체 해제도 순회한다 */
    for (const feature of map.data.getAllFeature()) {
      map.data.revertStyle(feature);
      if (feature.getProperty("grid_id") === current) {
        map.data.overrideStyle(feature, selectedStyle);
      }
    }
  }, [map, dongGrids, current]);

  return (
    <div className="flex h-dvh flex-col">
      <TopBar
        mode="field"
        crumbs={[{ label: region.label ?? "동 선택", to: "/field" }, { label: "격자 선택" }]}
      />

      {/* 좌 지도 + 우 리사이즈 패널 2열 (접기 가능) — relative는 접힘 탭 앵커용 */}
      <main className="relative flex min-h-0 flex-1 gap-3 p-3">
        <MapCanvas
          ariaLabel={`${region.dongNm ?? "선택한 동"} 1km 격자`}
          zoom={14}
          onMapReady={setMap}
          className="min-w-0"
        >
          {/* 범례는 우상단 — 하단은 줌(좌)·현재 위치(중앙) 차지 (B1과 동일 배치) */}
          <Legend className="absolute top-3 right-3" />
          <MapZoomControls />
          <LocateButton
            status={position.status}
            message={position.message}
            onLocate={position.locate}
          />
        </MapCanvas>

        {/* 격자 우선순위 리스트 — 리스트↔지도 양방향 연동 */}
        <MapSidePanel ariaLabel="격자 우선순위 패널">
          <h2 className="flex h-12 shrink-0 items-center gap-2 border-b border-hairline px-3 text-title-sm text-ink">
            격자 우선순위
            <span className="text-caption font-normal text-subtle">
              총 <DataText>{rows.length}</DataText>구역
            </span>
          </h2>

          {/* 정렬 필터 */}
          <div className="flex shrink-0 flex-wrap gap-2 border-b border-hairline p-3">
            {(Object.keys(GRID_SORT) as GridSort[]).map((key) => {
              /* 거리순은 현재 위치가 있어야 성립한다 — 없으면 누를 수 없고 사유를 붙인다 */
              const needsPosition = key === "distance" && !position.coords;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={sort === key}
                  disabled={needsPosition}
                  title={needsPosition ? "'현재 위치'를 먼저 눌러 주세요" : undefined}
                  onClick={() => setSort(key)}
                  className={cn(
                    "h-11 rounded-md border px-3 text-body-sm",
                    needsPosition
                      ? "cursor-not-allowed border-hairline bg-surface text-subtle opacity-50"
                      : sort === key
                        ? "border-brand bg-brand-tint text-brand-hover"
                        : "border-hairline-strong bg-surface text-body hover:bg-surface-muted",
                  )}
                >
                  {GRID_SORT[key].label}
                </button>
              );
            })}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading && rows.length === 0 && <RowSkeleton density="field" rows={4} />}
            {error && <ErrorInline onRetry={() => (summary.error ? summary : grids).reload()} />}
            {!loading && !error && rows.length === 0 && (
              <EmptyState message="이 동의 격자 산출 결과가 없습니다" onAction={summary.reload} />
            )}
            {rows.map((g) => (
              <button
                key={g.gridId}
                type="button"
                onClick={() => setSelected(g.gridId)}
                aria-current={current === g.gridId ? "true" : undefined}
                className={cn(
                  "grid h-16 w-full grid-cols-[1fr_auto] items-center gap-2 border-b border-hairline border-l-4 border-l-transparent px-3 text-left hover:bg-surface-muted",
                  current === g.gridId && "border-l-brand bg-brand-tint hover:bg-brand-tint",
                )}
              >
                <span>
                  {/* 구역 번호 발번 규칙이 미정이라(DESIGN.md Known Gaps) 격자 코드를 그대로 식별자로 쓴다 */}
                  <span className="block text-body-md text-ink">
                    {region.dongNm} <DataText>{g.gridId}</DataText>
                  </span>
                  <span className="text-caption text-subtle">
                    <DataText>{g.targetCount}</DataText>주택 · 방문{" "}
                    <DataText>
                      {g.visitedCount}/{g.targetCount}
                    </DataText>
                    {/* 거리로 정렬하면서 값을 감추면 근거를 숨기는 셈이다 */}
                    {g.distance !== null && (
                      <>
                        {" · "}
                        <DataText>{(g.distance / 1000).toFixed(1)}</DataText>km
                      </>
                    )}
                  </span>
                </span>
                {g.props && <RiskBadge level={g.props.risk_level_cd} score={g.props.avg_score} />}
              </button>
            ))}
          </div>
          <div className="shrink-0 space-y-3 border-t border-hairline p-3">
            <HonestyLabel>
              위험도 = AI 예측 · 방문율 = 전 세대를 마친 주택/전체 주택 · 거리 = 현재 위치에서
              격자 중심까지 직선거리
            </HonestyLabel>
            <Button
              variant="primary"
              size="field-xl"
              className="w-full"
              disabled={!current || !dongCd}
              onClick={() => navigate(`/field/units?dongCd=${dongCd}&gridId=${current}`)}
            >
              이 구역 들어가기
            </Button>
          </div>
        </MapSidePanel>
      </main>
    </div>
  );
}
