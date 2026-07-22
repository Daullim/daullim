import { useState } from "react";
import { TopBar } from "@/components/layout/top-bar";
import { Legend } from "@/components/layout/legend";
import { MapPlaceholder } from "@/components/layout/map-placeholder";
import { Button } from "@/components/core/button";
import { DataText } from "@/components/core/data-text";
import { QueueRow } from "@/components/core/queue-row";
import { RegionSelector, type RegionValue } from "@/components/core/region-selector";
import { LastUpdated } from "@/components/core/system-states";
import { HOUSEHOLDS, SUMMARY } from "@/mock/sample";

/** 다크 요약 바의 카운터 — 유일한 다크 서피스 위 (DESIGN.md Colors/Surface) */
function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-caption text-on-dark-soft">{label}</span>
      <DataText className="text-data-lg text-on-dark">
        {value.toLocaleString()}
      </DataText>
    </div>
  );
}

/** 아키타입 A — /control 관제 (데스크톱 ≥1280 전용) */
export default function ControlPage() {
  const [region, setRegion] = useState<RegionValue>({
    sido: "seoul",
    sigungu: "gwanak",
    dong: "eunhcheon",
  });
  const [selectedRank, setSelectedRank] = useState<number | null>(1);

  return (
    <div className="flex h-dvh min-w-320 flex-col">
      <TopBar mode="control" />

      {/* 지역 셀렉터 + 툴바 */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-hairline bg-surface px-4 py-2">
        <RegionSelector value={region} onChange={setRegion} density="control" />
        <Legend className="ml-auto" />
        <Button variant="primary">2026 3분기 발행</Button>
      </div>

      {/* 좌 지도 + 우 큐 테이블 — 지도 영역 크기 고정 (CLS 0) */}
      <main className="flex min-h-0 flex-1 gap-3 p-3">
        <MapPlaceholder label="관악구 은천동 — 취약가구 위험지도" />
        <aside className="flex w-120 shrink-0 flex-col overflow-hidden rounded-md border border-hairline bg-surface">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-hairline px-3">
            <h2 className="text-title-sm text-ink">우선순위 큐</h2>
            <LastUpdated seconds={SUMMARY.updatedSecondsAgo} />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {HOUSEHOLDS.map((item) => (
              <QueueRow
                key={item.rank}
                item={item}
                density="control"
                selected={selectedRank === item.rank}
                onSelect={() => setSelectedRank(item.rank)}
              />
            ))}
          </div>
        </aside>
      </main>

      {/* 하단 요약 카운터 — 시스템의 유일한 다크 서피스 */}
      <footer className="flex h-16 shrink-0 items-center gap-10 bg-surface-dark px-6">
        <Counter label="대상 가구" value={SUMMARY.target} />
        <Counter label="점검 완료" value={SUMMARY.done} />
        <Counter label="위험 등급" value={SUMMARY.danger} />
        <span className="ml-auto text-caption text-on-dark-soft">
          서울 관악구 · 2026 3분기
        </span>
      </footer>
    </div>
  );
}
