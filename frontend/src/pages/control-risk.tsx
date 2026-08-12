import type React from "react";
import { BarRow } from "@/components/core/bar-row";
import { DataText } from "@/components/core/data-text";
import { StackedBar, type StackedBarSegment } from "@/components/core/stacked-bar";
import { EmptyState, ErrorInline, RowSkeleton } from "@/components/core/system-states";
import { getDashboardComposition } from "@/api/queries";
import { useApiQuery } from "@/api/use-api-query";
import type { DashboardComposition } from "@/api/types";
import { HOUSE_TYPE, REGION_TYPE, RISK_LEVEL, type RiskLevel } from "@/config/domain";
import { useControlScope } from "@/lib/use-control-scope";
import { cn } from "@/lib/utils";

const RISK_ORDER: RiskLevel[] = ["danger", "warn", "ok"];
const RR_STATS: { label: string; key: keyof DashboardComposition["rrDistribution"] }[] = [
  { label: "최소", key: "min" },
  { label: "중앙", key: "p50" },
  { label: "상위 1%", key: "p99" },
  { label: "최대", key: "max" },
];

function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-md border border-hairline bg-surface p-4", className)}>
      <h2 className="mb-4 text-title-sm text-ink">{title}</h2>
      {children}
    </section>
  );
}

function riskSegments(composition: DashboardComposition): StackedBarSegment[] {
  return RISK_ORDER.map((level) => {
    const row = composition.byRiskLevel.find((item) => item.code === level);
    return {
      level,
      value: row?.buildingCount ?? 0,
      label: RISK_LEVEL[level].label,
    };
  });
}

function formatRr(value: number | null): string {
  return value == null ? "—" : `${value.toFixed(2)}배`;
}

function totalBuildings(composition: DashboardComposition | undefined): number {
  return composition?.byRiskLevel.reduce((sum, row) => sum + row.buildingCount, 0) ?? 0;
}

export default function ControlRiskPage() {
  const { sidoCd, sidoNm, sigunguCd, sigunguNm } = useControlScope();
  const composition = useApiQuery(`dashboard-composition:${sigunguCd ?? sidoCd ?? "all"}`, (signal) =>
    getDashboardComposition({ sidoCd: sigunguCd ? undefined : sidoCd, sigunguCd }, signal),
  );

  if (composition.loading && !composition.data) {
    return <RowSkeleton rows={8} />;
  }

  if (composition.error) {
    return <ErrorInline onRetry={composition.reload} />;
  }

  if (!composition.data || totalBuildings(composition.data) === 0) {
    return <EmptyState message="이 관할의 산출 결과가 없습니다" onAction={composition.reload} />;
  }

  const data = composition.data;
  const houseMax = Math.max(...data.byHouseType.map((row) => row.buildingCount), 0);
  const decadeMax = Math.max(...data.byUseAprDecade.map((row) => row.buildingCount), 0);
  const regionTitle = sigunguNm ?? sidoNm ?? "전체 지역";

  return (
    <div className="space-y-3 pt-5 pl-5 pr-5">
      <header className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h1 className="text-display text-ink">{regionTitle}</h1>
        <span className="text-title-sm text-body">위험 분석 통계</span>
      </header>

      <div className="grid gap-3 xl:grid-cols-2">
        <Panel title="위험 등급 구성">
          <StackedBar segments={riskSegments(data)} />
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-hairline pt-3">
            {data.byRiskLevel.map((row) => (
              <div key={row.code}>
                <p className="text-caption text-subtle">{RISK_LEVEL[row.code].label}</p>
                <DataText className="text-title-sm text-ink">
                  {row.buildingCount.toLocaleString()}
                </DataText>
                <p className="text-caption text-subtle">세대 {row.unitCount.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="도농 × 등급">
          <div className="space-y-4">
            {data.byRegionType.map((row) => (
              <div key={row.code} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-body-sm text-ink">{REGION_TYPE[row.code].label}</span>
                  <DataText className="text-body-sm text-subtle">
                    {(row.danger + row.warn + row.ok).toLocaleString()}
                  </DataText>
                </div>
                <StackedBar
                  segments={[
                    { level: "danger", value: row.danger },
                    { level: "warn", value: row.warn },
                    { level: "ok", value: row.ok },
                  ]}
                />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="주택 유형">
          <div className="space-y-3">
            {data.byHouseType.map((row) => (
              <BarRow
                key={row.code}
                label={HOUSE_TYPE[row.code].label}
                value={row.buildingCount}
                max={houseMax}
                valueLabel={`${row.buildingCount.toLocaleString()}채 · ${row.unitCount.toLocaleString()}세대`}
              />
            ))}
          </div>
        </Panel>

        <Panel title="건축 연대">
          <div className="space-y-3">
            {data.byUseAprDecade.map((row) => (
              <BarRow
                key={row.decade ?? "unknown"}
                label={row.decade == null ? "미상" : `${row.decade}년대`}
                value={row.buildingCount}
                max={decadeMax}
                estimated={row.decade == null}
                valueWidth="auto"
              />
            ))}
          </div>
        </Panel>

        <Panel title="상대위험도 분포" className="xl:col-span-2">
          <div className="grid gap-3 sm:grid-cols-4">
            {RR_STATS.map((stat) => (
              <div
                key={stat.key}
                className="border-l border-hairline pl-3 first:border-l-0 first:pl-0"
              >
                <p className="text-caption text-subtle">{stat.label}</p>
                <DataText className="text-title-sm text-ink">
                  {formatRr(data.rrDistribution[stat.key])}
                </DataText>
              </div>
            ))}
          </div>
          <p className="mt-3 text-caption text-subtle">
            좌표 추정 주택 <DataText>{data.estimatedBuildingCount.toLocaleString()}</DataText>
          </p>
        </Panel>
      </div>
    </div>
  );
}
