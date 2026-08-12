import { useEffect, useMemo, useRef, useState } from "react";
import { Legend } from "@/components/layout/legend";
import { MapCanvas } from "@/components/layout/map-canvas";
import { DataText } from "@/components/core/data-text";
import { HonestyLabel } from "@/components/core/honesty-label";
import { RiskBadge } from "@/components/core/risk-badge";
import { EmptyState, ErrorInline, RowSkeleton } from "@/components/core/system-states";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useControlScope } from "@/lib/use-control-scope";
import { getAdminDongBoundaries, getDongs } from "@/api/queries";
import { useApiQuery } from "@/api/use-api-query";
import {
  adminChoroplethStyles,
  boundsOfAdminBoundary,
  filterToSigungu,
} from "@/lib/admin-boundary-layer";
import { scrollRowIntoList } from "@/lib/scroll-row-into-list";
import { REGION_CENTER } from "@/lib/naver-maps";
import { cn } from "@/lib/utils";
import type { Dong } from "@/api/types";

type SortKey = "score" | "danger" | "target" | "progress";

/**
 * 기본값이 `score`인 이유 — 위험 주택 수로 정렬하면 큰 동이 늘 위라 작은 동의 신호가 죽는다.
 * 평균 점수는 규모와 무관해 동끼리 그대로 견줄 수 있다.
 */
const SORTS: { key: SortKey; label: string; compare: (a: Dong, b: Dong) => number }[] = [
  { key: "score", label: "위험도", compare: (a, b) => b.avgRiskScore - a.avgRiskScore },
  { key: "danger", label: "위험 주택", compare: (a, b) => b.dangerCount - a.dangerCount },
  { key: "target", label: "대상 세대", compare: (a, b) => b.householdCount - a.householdCount },
  { key: "progress", label: "진행률", compare: (a, b) => rate(a) - rate(b) },
];

/** 진행률 오름차순 = 덜 된 동이 위 — 이 표는 "어디부터 손대나"를 답한다. */
function rate(d: Dong): number {
  return d.householdCount === 0 ? 1 : d.doneUnitCount / d.householdCount;
}

const rowId = (dongCd: string) => `control-dong-${dongCd}`;

/** 산출 시각은 pipeline 월 1회라 날짜까지만 — 초 단위는 응답 시각(LastUpdated)의 축이다. */
function formatComputedAt(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

/** 진행 셀의 인라인 막대 — 값은 옆 수치가 말하고 막대는 훑어보기용이다. */
function ProgressCell({ done, total }: { done: number; total: number }) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <span className="flex items-center justify-end gap-2">
      <span aria-hidden className="h-2 w-16 overflow-hidden rounded-xs bg-surface-muted">
        <span className="block h-full bg-brand" style={{ width: `${percent}%` }} />
      </span>
      <DataText className="w-10 text-right">{percent}%</DataText>
    </span>
  );
}

/** 관제 ① 관내 현황 — 관할 한 장 요약. 동이 단위이고 건물은 여기서 다루지 않는다. */
export default function ControlOverviewPage() {
  const { sigunguCd, sigunguNm, summary } = useControlScope();
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [selectedDong, setSelectedDong] = useState<string | null>(null);
  const [map, setMap] = useState<naver.maps.Map | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const dongs = useApiQuery(sigunguCd ? `dongs:${sigunguCd}` : null, (s) => getDongs(sigunguCd!, s));
  const boundaries = useApiQuery("adminDongBoundaries", (s) => getAdminDongBoundaries(s));

  /* 시군구가 바뀌면 이전 동 선택은 이 지도에 없는 폴리곤을 가리킨다 */
  useEffect(() => setSelectedDong(null), [sigunguCd]);

  const rows = useMemo(() => {
    const compare = SORTS.find((s) => s.key === sortKey)!.compare;
    return [...(dongs.data ?? [])].sort(compare);
  }, [dongs.data, sortKey]);

  /** 등급은 폴리곤이 아니라 조회 결과가 안다 — 둘을 dongCd로 잇는다 */
  const levelByDong = useMemo(
    () => new Map((dongs.data ?? []).map((d) => [d.dongCd, d.avgRiskLevelCd])),
    [dongs.data],
  );

  const sigunguBoundaries = useMemo(() => {
    if (!sigunguCd || !boundaries.data) return null;
    return filterToSigungu(boundaries.data, sigunguCd);
  }, [boundaries.data, sigunguCd]);

  /* 경계를 얹고 관할 전체가 보이게 맞춘다 */
  useEffect(() => {
    if (!map || !sigunguBoundaries?.features.length) return;

    map.data.setStyle(adminChoroplethStyles(levelByDong).base);
    map.data.addGeoJson(sigunguBoundaries, false);

    const bounds = boundsOfAdminBoundary(sigunguBoundaries);
    if (bounds) map.fitBounds(bounds);

    return () => map.data.removeGeoJson(sigunguBoundaries);
  }, [map, sigunguBoundaries, levelByDong]);

  /* 지도 → 표: 폴리곤을 누르면 그 행이 선택되고 목록 안으로 스크롤된다 */
  useEffect(() => {
    if (!map) return;
    const listener = map.data.addListener("click", (e: naver.maps.FeatureEvent) => {
      const dongCd = e.feature.getProperty("dong_cd");
      if (typeof dongCd !== "string") return;
      setSelectedDong(dongCd);
      scrollRowIntoList(listRef.current, rowId(dongCd));
    });
    return () => map.data.removeListener(listener);
  }, [map]);

  /* 표 → 지도: 선택한 동만 테두리로 강조한다. 면을 덮으면 그 동의 위험도가 지워진다 */
  useEffect(() => {
    if (!map || !sigunguBoundaries?.features.length) return;
    const { selected } = adminChoroplethStyles(levelByDong);

    for (const feature of map.data.getAllFeature()) {
      map.data.revertStyle(feature);
      if (feature.getProperty("dong_cd") === selectedDong) {
        map.data.overrideStyle(feature, selected);
      }
    }
  }, [map, selectedDong, sigunguBoundaries, levelByDong]);

  const computedAt = formatComputedAt(summary?.computedAt);

  return (
    /* lg 이상은 화면 높이에 맞춰 잠근다 — 표가 길어져도 지도가 따라 늘거나 스크롤되지 않는다.
       좁은 폭에서는 2열이 성립하지 않아 세로로 쌓고 페이지 스크롤을 허용한다. */
    <div className="flex flex-col gap-3 lg:h-full lg:min-h-0">
      <div className="flex min-h-0 flex-col gap-3 lg:flex-1 lg:flex-row">
        <MapCanvas
          ariaLabel={`${sigunguNm ?? "관할"} 행정동 위험지도`}
          center={sigunguCd ? REGION_CENTER[sigunguCd] : undefined}
          zoom={12}
          onMapReady={setMap}
          className="h-72 shrink-0 sm:h-96 lg:h-auto lg:min-h-0 lg:flex-1 lg:shrink"
        >
          {/* 범례는 지도 카드 안 플로팅 — 탭바에서 뺐다고 없애지 않는다 (DESIGN.md) */}
          <Legend className="absolute top-3 right-3" />
        </MapCanvas>

        <section
          aria-label="동별 현황"
          className="flex h-140 shrink-0 flex-col overflow-hidden rounded-md border border-hairline bg-surface lg:h-auto lg:min-h-0 lg:w-100 xl:w-120 2xl:w-140"
        >
          <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-hairline px-3">
            <h2 className="text-title-sm text-ink">동별 현황</h2>
            <span className="flex items-center gap-1">
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  aria-pressed={sortKey === s.key}
                  onClick={() => setSortKey(s.key)}
                  className={cn(
                    "h-8 rounded-sm px-2 text-caption",
                    sortKey === s.key
                      ? "bg-brand-tint text-brand"
                      : "text-subtle hover:bg-surface-muted",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </span>
          </div>

          <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
            {dongs.loading && !dongs.data && <RowSkeleton rows={8} />}
            {dongs.error && <ErrorInline onRetry={dongs.reload} />}
            {!dongs.loading && !dongs.error && rows.length === 0 && (
              <EmptyState message="이 관할의 산출 결과가 없습니다" onAction={dongs.reload} />
            )}
            {rows.length > 0 && (
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-surface">
                  {/* 헤더는 고를 수 없으니 호버 틴트를 끈다 — 행 선택과 같은 신호로 보인다 */}
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-full text-body">동</TableHead>
                    {/* 축을 헤더에 적는다 — 세대와 주택을 섞으면 곱하기 시작한다 */}
                    <TableHead className="text-right text-body">대상 세대</TableHead>
                    <TableHead className="text-right text-body">위험 주택</TableHead>
                    <TableHead className="text-right text-body">위험도</TableHead>
                    <TableHead className="text-right text-body">진행</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((d) => (
                    <TableRow
                      key={d.dongCd}
                      id={rowId(d.dongCd)}
                      onClick={() =>
                        setSelectedDong((prev) => (prev === d.dongCd ? null : d.dongCd))
                      }
                      aria-selected={selectedDong === d.dongCd}
                      className={cn(
                        "h-12 cursor-pointer",
                        selectedDong === d.dongCd && "bg-brand-tint",
                      )}
                    >
                      <TableCell className="max-w-0 truncate text-body-sm text-ink">
                        {d.dongNm}
                      </TableCell>
                      <TableCell className="text-right text-body-sm text-body">
                        <DataText>{d.householdCount.toLocaleString()}</DataText>
                      </TableCell>
                      <TableCell className="text-right text-body-sm text-body">
                        <DataText>{d.dangerCount.toLocaleString()}</DataText>
                      </TableCell>
                      <TableCell className="text-right">
                        {d.avgRiskLevelCd ? (
                          <RiskBadge level={d.avgRiskLevelCd} score={d.avgRiskScore} />
                        ) : (
                          <span className="text-body-sm text-subtle">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-body-sm text-body">
                        <ProgressCell done={d.doneUnitCount} total={d.householdCount} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </section>
      </div>

      {/* 신선도 띠 — 산출 시각은 pipeline 월 1회라 '방금 갱신'과 다른 축이다 */}
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <HonestyLabel className="flex-1">
          동 순위 = AI 위험 예측 · 위험도는 동 안 주택 점수의 평균
        </HonestyLabel>
        <span className="text-caption text-subtle">
          {computedAt ? (
            <>
              위험도 산출 <DataText>{computedAt}</DataText>
            </>
          ) : (
            "산출 시각 없음"
          )}
        </span>
      </div>
    </div>
  );
}
