import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/layout/top-bar";
import { Legend } from "@/components/layout/legend";
import { LocateButton } from "@/components/layout/locate-button";
import { MapPlaceholder } from "@/components/layout/map-placeholder";
import { MapZoomControls } from "@/components/layout/map-zoom-controls";
import { MapSidePanel } from "@/components/layout/map-side-panel";
import { Button } from "@/components/core/button";
import { DataText } from "@/components/core/data-text";
import { RiskBadge } from "@/components/core/risk-badge";
import { HonestyLabel } from "@/components/core/honesty-label";
import { GRIDS, type GridItem } from "@/mock/sample";
import { cn } from "@/lib/utils";

/* 정렬 필터 — UI 로컬 개념 (도메인 열거값 아님) */
type GridSort = "risk" | "unvisited" | "distance";

const GRID_SORT: Record<GridSort, { label: string; compare: (a: GridItem, b: GridItem) => number }> = {
  risk: { label: "위험순", compare: (a, b) => b.riskScore - a.riskScore },
  unvisited: {
    label: "미방문 가구 많은 순",
    compare: (a, b) => b.households - b.visited - (a.households - a.visited),
  },
  distance: {
    label: "현재 위치 기준 거리순",
    compare: (a, b) => a.distanceKm - b.distanceKm,
  },
};

/**
 * 아키타입 B2 — /field 격자 선택 (드릴다운 2/3, 도시 전용).
 * 격자 위험 밀집 표시 방식은 결정 대기 — 지도는 "옅은 실선 경계"까지만
 * (DESIGN.md Known Gaps). 농촌 동은 이 단계를 건너뛰고 B3로 직행한다.
 */
export default function FieldGridPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string>(GRIDS[0].gridId);
  const [sort, setSort] = useState<GridSort>("risk");

  const grids = [...GRIDS].sort(GRID_SORT[sort].compare);

  return (
    <div className="flex h-dvh flex-col">
      <TopBar
        mode="field"
        crumbs={[{ label: "관악구 은천동", to: "/field" }, { label: "격자 선택" }]}
      />

      {/* 전면 지도 + 우측 리사이즈 패널 (접기 가능) */}
      <main className="relative min-h-0 flex-1">
        <MapPlaceholder
          label="은천동 — 500m 격자 (옅은 실선 경계)"
          className="h-full rounded-none border-none"
        >
          <Legend className="absolute bottom-3 left-3" />
        </MapPlaceholder>
        <MapZoomControls />
        <LocateButton />

        {/* 격자 우선순위 리스트 — 리스트↔지도 양방향 연동 */}
        <MapSidePanel ariaLabel="격자 우선순위 패널">
          <h2 className="flex h-12 shrink-0 items-center gap-2 border-b border-hairline px-3 text-title-sm text-ink">
            격자 우선순위
            <span className="text-caption font-normal text-subtle">
              총 <DataText>{GRIDS.length}</DataText>구역
            </span>
          </h2>

          {/* 정렬 필터 */}
          <div className="flex shrink-0 flex-wrap gap-2 border-b border-hairline p-3">
            {(Object.keys(GRID_SORT) as GridSort[]).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={sort === key}
                onClick={() => setSort(key)}
                className={cn(
                  "h-11 rounded-md border px-3 text-body-sm",
                  sort === key
                    ? "border-brand bg-brand-tint text-brand-hover"
                    : "border-hairline-strong bg-surface text-body hover:bg-surface-muted",
                )}
              >
                {GRID_SORT[key].label}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {grids.map((g) => (
              <button
                key={g.gridId}
                type="button"
                onClick={() => setSelected(g.gridId)}
                aria-current={selected === g.gridId ? "true" : undefined}
                className={cn(
                  "grid h-16 w-full grid-cols-[1fr_auto] items-center gap-2 border-b border-hairline border-l-4 border-l-transparent px-3 text-left hover:bg-surface-muted",
                  selected === g.gridId &&
                    "border-l-brand bg-brand-tint hover:bg-brand-tint",
                )}
              >
                <span>
                  <span className="block text-body-md text-ink">
                    은천동 {g.zone}구역
                  </span>
                  <span className="text-caption text-subtle">
                    <DataText>{g.gridId}</DataText> · <DataText>{g.households}</DataText>
                    가구 · 방문{" "}
                    <DataText>
                      {g.visited}/{g.households}
                    </DataText>
                  </span>
                </span>
                <RiskBadge level={g.level} score={g.riskScore} />
              </button>
            ))}
          </div>
          <div className="shrink-0 space-y-3 border-t border-hairline p-3">
            <HonestyLabel>
              위험도 = AI 예측 · 방문율 = 방문 가구/전체 · 거리·현재 위치는 지도 연동
              후 활성
            </HonestyLabel>
            <Button
              variant="primary"
              size="field-xl"
              className="w-full"
              onClick={() => navigate("/field/units")}
            >
              이 구역 들어가기
            </Button>
          </div>
        </MapSidePanel>
      </main>
    </div>
  );
}
