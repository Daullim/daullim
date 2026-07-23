import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { TopBar } from "@/components/layout/top-bar";
import { Legend } from "@/components/layout/legend";
import { LocateButton } from "@/components/layout/locate-button";
import { MapPlaceholder } from "@/components/layout/map-placeholder";
import { MapZoomControls } from "@/components/layout/map-zoom-controls";
import { MapSidePanel } from "@/components/layout/map-side-panel";
import { Button } from "@/components/core/button";
import { DataText } from "@/components/core/data-text";
import { HonestyLabel } from "@/components/core/honesty-label";
import { QueueRow } from "@/components/core/queue-row";
import { LastUpdated } from "@/components/core/system-states";
import { InspectionOverlay } from "@/pages/inspection-overlay";
import { HOUSEHOLDS, type HouseholdItem } from "@/mock/sample";

/**
 * 아키타입 B3 — /field 주택/가구 선택 (드릴다운 3/3).
 * 도시: 격자 확대 지도 + 방문 큐. 농촌(?rural=1): 격자 단계를 건너뛰고
 * 동 전체 가구 색핀 — 브레드크럼 경로가 짧아진다.
 */
export default function FieldUnitsPage() {
  const [params] = useSearchParams();
  const rural = params.get("rural") === "1";
  const [inspecting, setInspecting] = useState<HouseholdItem | null>(null);
  const [doneRanks, setDoneRanks] = useState<Set<number>>(new Set([4]));

  const crumbs = rural
    ? [{ label: "임실군 임실읍", to: "/field" }, { label: "가구 선택" }]
    : [
        { label: "관악구 은천동", to: "/field" },
        { label: "GA-0412", to: "/field/grid" },
        { label: "주택 선택" },
      ];

  return (
    <div className="flex h-dvh flex-col">
      <TopBar mode="field" crumbs={crumbs} />

      {/* 전면 지도 + 우측 리사이즈 패널 (접기 가능) */}
      <main className="relative min-h-0 flex-1">
        <MapPlaceholder
          label={
            rural
              ? "임실읍 — 가구 3구간 색핀 (2단계 진입)"
              : "격자 GA-0412 확대 — 주택 3구간 색핀 · 완료 체크"
          }
          className="h-full rounded-none border-none"
        >
          <Legend className="absolute bottom-3 left-3" />
        </MapPlaceholder>
        <MapZoomControls />
        <LocateButton />

        {/* 방문 큐 (위험순, 완료 흐리게) */}
        <MapSidePanel ariaLabel="방문 큐 패널">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-hairline px-3">
            <h2 className="text-title-sm text-ink">방문 큐 (위험순)</h2>
            <span className="flex items-center gap-3">
              <span className="text-caption text-subtle">
                진행{" "}
                <DataText>
                  {doneRanks.size}/{HOUSEHOLDS.length}
                </DataText>
              </span>
              <LastUpdated seconds={7} />
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {HOUSEHOLDS.map((item) => (
              <QueueRow
                key={item.rank}
                item={item}
                density="field"
                dimmed={doneRanks.has(item.rank)}
                selected={inspecting?.rank === item.rank}
                onSelect={() => setInspecting(item)}
              />
            ))}
          </div>
          <div className="shrink-0 space-y-3 border-t border-hairline p-3">
            {!rural && (
              <HonestyLabel>
                주택 순서 = 보급연차·동선 기준 · 현재 위치는 지도 연동 후 활성
              </HonestyLabel>
            )}
            <Button variant="secondary" size="field-xl" className="w-full">
              다음 우선순위 3건
            </Button>
          </div>
        </MapSidePanel>
      </main>

      {/* 점검 오버레이(C) — 저장 시 해당 항목 완료 반영 후 B3 복귀 */}
      <InspectionOverlay
        item={inspecting}
        open={inspecting !== null}
        onClose={() => setInspecting(null)}
        onSaved={() => {
          if (inspecting) {
            setDoneRanks((prev) => new Set(prev).add(inspecting.rank));
          }
          setInspecting(null);
        }}
      />
    </div>
  );
}
