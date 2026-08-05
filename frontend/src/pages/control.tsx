import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RotateCw } from "lucide-react";
import { TopBar } from "@/components/layout/top-bar";
import { Legend } from "@/components/layout/legend";
import { MapPlaceholder } from "@/components/layout/map-placeholder";
import { Button } from "@/components/core/button";
import { DataText } from "@/components/core/data-text";
import { QueueRow } from "@/components/core/queue-row";
import { RegionSelector, type RegionValue } from "@/components/core/region-selector";
import { EmptyState, ErrorInline, LastUpdated, RowSkeleton } from "@/components/core/system-states";
import { getBuildingQueue, getDashboardSummary } from "@/api/queries";
import { useApiQuery } from "@/api/use-api-query";
import { useRegionNames } from "@/api/use-region";

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
  const navigate = useNavigate();
  /* 값은 행정표준코드다. 셀렉터가 첫 시도·시군구·동까지 채워 화면 진입 즉시 큐가 뜬다 */
  const [region, setRegion] = useState<RegionValue>({});
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const names = useRegionNames(region.dong);

  const queue = useApiQuery(region.dong ? `queue:${region.dong}` : null, (s) =>
    getBuildingQueue({ dongCd: region.dong!, size: 100 }, s),
  );
  /* 카운터는 시군구 단위 — 큐는 동으로 좁혀 보지만 관제 요약은 관할 전체다 */
  const summary = useApiQuery(region.sigungu ? `summary:${region.sigungu}` : null, (s) =>
    getDashboardSummary(region.sigungu!, s),
  );

  /* 갱신 시각은 응답이 온 순간부터 다시 센다 */
  const [updatedSeconds, setUpdatedSeconds] = useState(0);
  useEffect(() => {
    setUpdatedSeconds(0);
    const timer = setInterval(() => setUpdatedSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [queue.data, summary.data]);

  const items = queue.data?.items ?? [];

  const reload = () => {
    queue.reload();
    summary.reload();
  };

  return (
    <div className="flex h-dvh flex-col">
      <TopBar mode="control" />

      {/* 지역 셀렉터 + 툴바 */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-hairline bg-surface px-4 py-2">
        <RegionSelector
          value={region}
          onChange={setRegion}
          density="control"
          autoSelect="dong"
        />
        <Legend className="ml-auto" />
        <Button variant="primary" onClick={() => navigate("/field")}>
          현장모드로 전환
        </Button>
      </div>

      {/* 좌 지도 + 우 큐 테이블 — 지도 영역 크기 고정 (CLS 0) */}
      <main className="flex min-h-0 flex-1 gap-3 p-3">
        <MapPlaceholder label={`${names.label ?? "지역 선택"} — 취약가구 위험지도`} />
        <aside className="flex w-100 shrink-0 flex-col overflow-hidden rounded-md border border-hairline bg-surface xl:w-120">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-hairline px-3">
            <h2 className="text-title-sm text-ink">우선순위 큐</h2>
            <span className="flex items-center gap-1">
              <button
                type="button"
                aria-label="새로고침"
                onClick={reload}
                className="flex size-10 items-center justify-center rounded-md text-body hover:bg-surface-muted"
              >
                <RotateCw aria-hidden className="size-4" />
              </button>
              <LastUpdated seconds={updatedSeconds} />
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {queue.loading && items.length === 0 && <RowSkeleton rows={8} />}
            {queue.error && <ErrorInline onRetry={queue.reload} />}
            {!queue.loading && !queue.error && items.length === 0 && (
              <EmptyState onAction={queue.reload} />
            )}
            {items.map((item, index) => (
              <QueueRow
                key={item.buildingId}
                item={item}
                rank={index + 1}
                density="control"
                selected={selectedId === item.buildingId}
                onSelect={() => setSelectedId(item.buildingId)}
              />
            ))}
          </div>
        </aside>
      </main>

      {/* 하단 요약 카운터 — 시스템의 유일한 다크 서피스 */}
      <footer className="flex h-16 shrink-0 items-center gap-6 bg-surface-dark px-6 xl:gap-10">
        {/* 대상·완료는 세대 축, 위험 등급은 건물 축이다 (docs/openapi.yaml H-3) */}
        <Counter label="대상 가구" value={summary.data?.targetCount ?? 0} />
        <Counter label="점검 완료" value={summary.data?.doneCount ?? 0} />
        <Counter label="위험 등급 주택" value={summary.data?.dangerCount ?? 0} />
        <span className="ml-auto text-caption text-on-dark-soft">
          {names.sigunguNm ?? "관할 미선택"}
        </span>
      </footer>
    </div>
  );
}
