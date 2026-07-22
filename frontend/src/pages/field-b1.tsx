import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/layout/top-bar";
import { DrilldownHeader } from "@/components/layout/drilldown-header";
import { Legend } from "@/components/layout/legend";
import { MapPlaceholder } from "@/components/layout/map-placeholder";
import { Button } from "@/components/core/button";
import { DataText } from "@/components/core/data-text";
import { RegionSelector, type RegionValue } from "@/components/core/region-selector";
import { RURAL_SIGUNGU } from "@/mock/sample";

/** 아키타입 B1 — /field 동 선택 (드릴다운 1/3) */
export default function FieldDongPage() {
  const navigate = useNavigate();
  const [region, setRegion] = useState<RegionValue>({
    sido: "seoul",
    sigungu: "gwanak",
    dong: "eunhcheon",
  });
  const isRural = region.sigungu ? RURAL_SIGUNGU.has(region.sigungu) : false;

  return (
    <div className="flex h-dvh flex-col">
      <TopBar mode="field" />
      <DrilldownHeader crumbs={[{ label: "동 선택" }]} step={1} />

      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-hairline bg-surface px-4 py-2">
        <RegionSelector value={region} onChange={setRegion} density="field" />
        <Legend className="ml-auto" />
      </div>

      {/* 전면 지도 (동 경계 플레이스홀더) */}
      <main className="flex min-h-0 flex-1 flex-col gap-3 p-3">
        <MapPlaceholder label="은천동 — 동 경계" />

        {/* 하단 동 요약 + 진입 액션 */}
        <section className="flex shrink-0 flex-col gap-3 rounded-md border border-hairline bg-surface p-4 md:flex-row md:items-center">
          <div className="flex flex-1 flex-wrap items-center gap-x-8 gap-y-2">
            <div>
              <p className="text-caption text-subtle">대상 가구</p>
              <p className="text-body-md text-ink">
                <DataText>159</DataText>가구
              </p>
            </div>
            <div>
              <p className="text-caption text-subtle">도농 자동판별</p>
              <p className="text-body-md text-ink">
                {isRural ? "농촌 — 격자 단계 생략, 가구 색핀 직행" : "도시 — 격자(500m) 단계 진행"}
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="field-xl"
            className="md:w-64"
            disabled={!region.dong}
            onClick={() => navigate(isRural ? "/field/units?rural=1" : "/field/grid")}
          >
            이 동 들어가기
          </Button>
        </section>
      </main>
    </div>
  );
}
