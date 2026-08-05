import { Fragment, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { RotateCw, Search } from "lucide-react";
import { TopBar } from "@/components/layout/top-bar";
import { Legend } from "@/components/layout/legend";
import { LocateButton } from "@/components/layout/locate-button";
import { MapCanvas } from "@/components/layout/map-canvas";
import { MapZoomControls } from "@/components/layout/map-zoom-controls";
import { MapSidePanel } from "@/components/layout/map-side-panel";
import { UnitPanel } from "@/components/layout/unit-panel";
import { Button } from "@/components/core/button";
import { DataText } from "@/components/core/data-text";
import { QueueRow } from "@/components/core/queue-row";
import { EmptyState, ErrorInline, LastUpdated, RowSkeleton } from "@/components/core/system-states";
import { InspectionOverlay } from "@/pages/inspection-overlay";
import { CONSENT_TO_UNIT_STATUS, HOUSE_TYPE } from "@/config/domain";
import { formatDay } from "@/lib/inspection";
import { isQueueItemDone, todayDay, unitLabel } from "@/lib/units";
import { useBuildingPins } from "@/lib/use-building-pins";
import { ApiError } from "@/api/client";
import { getBuilding, getBuildingQueue, getUnits, renameUnit } from "@/api/queries";
import { useApiQuery } from "@/api/use-api-query";
import { useRegionNames } from "@/api/use-region";
import type { BuildingQueueItem, UnitItem } from "@/api/types";

/** 주소 검색은 서버가 한다 — 타자마다 보내지 않도록 잠깐 묵힌다 */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * 아키타입 B3 — /field 주택/가구 선택 (드릴다운 3/3).
 * 도시: 격자 확대 지도 + 방문 큐. 농촌(?rural=1): 격자 단계를 건너뛰고
 * 동 전체 가구 색핀 — 브레드크럼 경로가 짧아진다.
 *
 * 지역·격자는 URL이 들고 있어(`?dongCd=&gridId=`) 새로고침해도 화면이 복원된다.
 */
export default function FieldUnitsPage() {
  const [params] = useSearchParams();
  const dongCd = params.get("dongCd") ?? undefined;
  const gridId = params.get("gridId") ?? undefined;
  const rural = params.get("rural") === "1";
  const region = useRegionNames(dongCd);

  /** 큐 행 아래 액션 드롭다운(길찾기·세대 보기)이 열린 행 */
  const [selectedId, setSelectedId] = useState<number | null>(null);
  /** 세대 목록 패널 오픈 대상 */
  const [openId, setOpenId] = useState<number | null>(null);
  /** 점검 폼은 세대 단위로만 열린다 */
  const [inspecting, setInspecting] = useState<{ buildingId: number; unitId: number } | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [renameError, setRenameError] = useState<string>();
  const [map, setMap] = useState<naver.maps.Map | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  /* 공백 무시 매칭도 서버 몫이다 — address_norm이 공백을 지운 GENERATED 컬럼이라 규칙이 한 곳에만 있다 */
  const queue = useApiQuery(
    dongCd ? `queue:${dongCd}:${gridId ?? ""}:${debouncedQuery}` : null,
    (s) => getBuildingQueue({ dongCd: dongCd!, gridId, q: debouncedQuery, size: 100 }, s),
  );

  const building = useApiQuery(openId ? `building:${openId}` : null, (s) =>
    getBuilding(openId!, s),
  );
  const units = useApiQuery(openId ? `units:${openId}` : null, (s) => getUnits(openId!, s));

  /**
   * 점검 저장 결과의 로컬 반영 — 방문 저장 API(`POST /units/{unitId}/visits`)가 아직 없어
   * 서버가 상태를 되돌려주지 못한다. 그때까지 화면만 앞서 나가고, 붙는 즉시 이 오버레이는 지운다.
   */
  const [visitOverrides, setVisitOverrides] = useState<Record<number, Partial<UnitItem>>>({});

  const mergedUnits = useMemo(
    () => (units.data ?? []).map((u) => ({ ...u, ...visitOverrides[u.unitId] })),
    [units.data, visitOverrides],
  );

  const items = queue.data?.items ?? [];
  /* 선택한 행이 있으면 그 건물로, 없으면 큐 1등으로 시점을 잡는다 */
  const focused = items.find((i) => i.buildingId === (openId ?? selectedId)) ?? items[0];
  const mapCenter = focused ? { lat: focused.lat, lng: focused.lng } : undefined;
  const doneBuildings = items.filter(isQueueItemDone).length;

  /* 핀 ↔ 큐 양방향 — 핀을 누르면 그 행이 열리고, 행을 고르면 그 핀이 강조된다 */
  useBuildingPins(map, items, { selectedId: selectedId ?? openId, onSelect: setSelectedId });
  const inspectUnit = mergedUnits.find((u) => u.unitId === inspecting?.unitId);
  const inspectItem = items.find((i) => i.buildingId === inspecting?.buildingId) ?? null;

  const [updatedSeconds, setUpdatedSeconds] = useState(0);
  useEffect(() => {
    setUpdatedSeconds(0);
    const timer = setInterval(() => setUpdatedSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [queue.data]);

  const commitRename = async (unitId: number, hoNm: string) => {
    setRenameError(undefined);
    try {
      await renameUnit(unitId, hoNm);
      units.reload();
    } catch (e) {
      /* 서버가 규칙의 최종 판정자다 — 403(대장 행)·409(중복 호수)를 그대로 전한다 */
      setRenameError(
        e instanceof ApiError ? e.message : "호수를 저장하지 못했습니다. 다시 시도해 주세요.",
      );
    }
  };

  /** 주소 아래 보조줄 — 최근 점검일 · 보급일(있을 때만) · 주택유형 */
  const captionOf = (item: BuildingQueueItem) => {
    const inspected = formatDay(item.lastInspectedDay);
    /* 보급일은 통합 대장이 없어 항상 비어 있다 — 값이 생기면 자동으로 다시 나타난다 */
    const installed = formatDay(item.installDay);
    return [inspected ?? "점검이력 없음", installed && `보급 ${installed}`, HOUSE_TYPE[item.houseTypeCd].label]
      .filter(Boolean)
      .join(" · ");
  };

  const crumbs = rural
    ? [{ label: region.label ?? "동 선택", to: "/field" }, { label: "가구 선택" }]
    : [
        { label: region.label ?? "동 선택", to: "/field" },
        { label: gridId ?? "격자", to: `/field/grid?dongCd=${dongCd}` },
        { label: "주택 선택" },
      ];

  return (
    <div className="flex h-dvh flex-col">
      <TopBar mode="field" crumbs={crumbs} />

      {/* 좌 지도 + 우 리사이즈 패널 2열 (접기 가능) — relative는 접힘 탭 앵커용 */}
      <main className="relative flex min-h-0 flex-1 gap-3 p-3">
        {/* 지도 열 — 세대 패널의 앵커. 패널은 지도 위에 절대배치하므로 이 래퍼가 기준점이다 */}
        <div className="relative flex min-w-0 flex-1">
          <MapCanvas
            ariaLabel={
              rural
                ? `${region.dongNm ?? "선택한 동"} 가구 지도`
                : `격자 ${gridId ?? ""} 주택 지도`
            }
            center={mapCenter}
            zoom={16}
            onMapReady={setMap}
            className="min-w-0"
          >
            {/* 범례는 우상단 — 하단은 줌(좌)·현재 위치(중앙) 차지 (B1과 동일 배치) */}
            <Legend className="absolute top-3 right-3" />
            <MapZoomControls />
            <LocateButton />
          </MapCanvas>

          {/* 세대 목록 — right-3이 큐 패널 접기 탭 pill 바로 앞이라 탭을 가리지 않는다 */}
          {openId && building.data && (
            <UnitPanel
              key={openId} // 건물 전환 시 패널 내부 세대 선택 리셋
              building={building.data}
              units={mergedUnits}
              onClose={() => {
                setOpenId(null);
                setRenameError(undefined);
              }}
              onInspect={(unitId) => setInspecting({ buildingId: openId, unitId })}
              onRenameUnit={commitRename}
              renameError={renameError}
              className="absolute inset-y-3 right-3 z-20"
            />
          )}
        </div>

        {/* 방문 큐 (위험순, 완료 흐리게) */}
        <MapSidePanel ariaLabel="방문 큐 패널">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-hairline px-3">
            <h2 className="text-title-sm text-ink">방문 큐 (위험순)</h2>
            <span className="flex items-center gap-3">
              {/* 진행률은 검색 필터와 무관하게 전체 기준 */}
              <span className="text-caption text-subtle">
                진행{" "}
                <DataText>
                  {doneBuildings}/{items.length}
                </DataText>
              </span>
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="새로고침"
                  onClick={queue.reload}
                  className="flex size-11 items-center justify-center rounded-md text-body hover:bg-surface-muted"
                >
                  <RotateCw aria-hidden className="size-4" />
                </button>
                <LastUpdated seconds={updatedSeconds} />
              </span>
            </span>
          </div>

          {/* 주소 검색 — 서버가 공백을 지우고 매칭한다 (shrink-0: 리스트 높이 고정) */}
          <div className="shrink-0 border-b border-hairline p-3">
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="주소 검색"
                placeholder="주소 검색"
                className="h-11 w-full rounded-sm border border-hairline-strong bg-surface pr-3 pl-9 text-body-md text-ink placeholder:text-subtle"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {queue.loading && items.length === 0 && <RowSkeleton density="field" rows={5} />}
            {queue.error && <ErrorInline onRetry={queue.reload} />}
            {!queue.loading && !queue.error && items.length === 0 && (
              <EmptyState
                message={
                  debouncedQuery ? "검색과 일치하는 주택이 없습니다" : "이 구역의 산출 결과가 없습니다"
                }
                actionLabel={debouncedQuery ? "검색어 지우기" : "다시 불러오기"}
                onAction={() => (debouncedQuery ? setQuery("") : queue.reload())}
              />
            )}
            {items.map((item, index) => {
              /* 단독·1세대는 완료/전체가 정보값이 없다 → null로 빈 슬롯 (undefined면 StatusTag 폴백) */
              const showProgress = item.unitCount > 1 && item.houseTypeCd !== "detached";
              return (
                <Fragment key={item.buildingId}>
                  <QueueRow
                    item={item}
                    rank={index + 1}
                    density="field"
                    dimmed={isQueueItemDone(item)}
                    selected={selectedId === item.buildingId}
                    onSelect={() =>
                      setSelectedId((prev) => (prev === item.buildingId ? null : item.buildingId))
                    }
                    caption={captionOf(item)}
                    trailing={
                      showProgress ? (
                        <DataText className="text-body">
                          {item.unitDoneCount}/{item.unitCount}
                        </DataText>
                      ) : null
                    }
                  />
                  {/* 액션 행 — QueueRow가 <button>이라 버튼 중첩 불가 → 형제로 렌더 */}
                  {selectedId === item.buildingId && (
                    <div
                      role="group"
                      aria-label={`${item.address} 이동·세대`}
                      className="flex gap-2 overflow-hidden border-b border-hairline bg-surface p-3 duration-150 animate-in fade-in-0 slide-in-from-top-2"
                    >
                      {/* 길찾기 — 카카오맵/티맵 딥링크 자리 (ADR-004 §3 보류) — 연동 전까지 동작 없음 */}
                      <Button variant="secondary" size="field-xl" className="w-32">
                        길찾기
                      </Button>
                      <Button
                        variant="primary"
                        size="field-xl"
                        className="flex-1"
                        onClick={() => setOpenId(item.buildingId)}
                      >
                        세대 보기
                      </Button>
                    </div>
                  )}
                </Fragment>
              );
            })}
          </div>
        </MapSidePanel>
      </main>

      {/* 점검 오버레이(C) — 저장 시 해당 '세대'에 결과 반영, 건물 완료는 파생 */}
      <InspectionOverlay
        item={inspectItem}
        unitLabel={inspectUnit ? unitLabel(inspectUnit) : undefined}
        open={inspecting !== null}
        onClose={() => setInspecting(null)}
        onSaved={(consent) => {
          if (inspecting && consent) {
            setVisitOverrides((prev) => ({
              ...prev,
              [inspecting.unitId]: {
                statusCd: CONSENT_TO_UNIT_STATUS[consent],
                lastInspectedDay: todayDay(), // 방문한 날이 곧 그 세대의 마지막 점검일
              },
            }));
          }
          setInspecting(null);
        }}
      />
    </div>
  );
}
