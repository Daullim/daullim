import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/layout/top-bar";
import { DrilldownHeader } from "@/components/layout/drilldown-header";
import { Legend } from "@/components/layout/legend";
import { MapPlaceholder } from "@/components/layout/map-placeholder";
import { Button } from "@/components/core/button";
import { DataText } from "@/components/core/data-text";
import { RiskBadge } from "@/components/core/risk-badge";
import { HonestyLabel } from "@/components/core/honesty-label";
import { GRIDS } from "@/mock/sample";
import { cn } from "@/lib/utils";

/**
 * 아키타입 B2 — /field 격자 선택 (드릴다운 2/3, 도시 전용).
 * 격자 위험 밀집 표시 방식은 결정 대기 — 지도는 "옅은 실선 경계"까지만
 * (DESIGN.md Known Gaps). 농촌 동은 이 단계를 건너뛰고 B3로 직행한다.
 */
export default function FieldGridPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string>(GRIDS[0].gridId);

  return (
    <div className="flex h-dvh flex-col">
      <TopBar mode="field" />
      <DrilldownHeader
        crumbs={[{ label: "은천동", to: "/field" }, { label: "격자 선택" }]}
        step={2}
      />

      <main className="flex min-h-0 flex-1 flex-col gap-3 p-3 md:flex-row">
        <MapPlaceholder
          label="은천동 — 500m 격자 (옅은 실선 경계)"
          className="max-md:h-60 max-md:flex-none"
        >
          <Legend className="absolute bottom-3 left-3" />
        </MapPlaceholder>

        {/* 격자 우선순위 리스트 — 리스트↔지도 양방향 연동 */}
        <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-md border border-hairline bg-surface md:w-90">
          <h2 className="flex h-12 shrink-0 items-center border-b border-hairline px-3 text-title-sm text-ink">
            격자 우선순위
          </h2>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {GRIDS.map((g) => (
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
                  <DataText className="block text-body-md text-ink">{g.gridId}</DataText>
                  <span className="text-caption text-subtle">
                    <DataText>{g.households}</DataText>가구
                  </span>
                </span>
                <RiskBadge level={g.level} score={g.riskScore} />
              </button>
            ))}
          </div>
          <div className="shrink-0 space-y-3 border-t border-hairline p-3">
            <HonestyLabel />
            <Button
              variant="primary"
              size="field-xl"
              className="w-full"
              onClick={() => navigate("/field/units")}
            >
              이 구역 들어가기
            </Button>
          </div>
        </aside>
      </main>
    </div>
  );
}
