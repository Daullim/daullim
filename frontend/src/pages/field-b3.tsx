import { Fragment, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { RotateCw, Search } from "lucide-react";
import { TopBar } from "@/components/layout/top-bar";
import { Legend } from "@/components/layout/legend";
import { LocateButton } from "@/components/layout/locate-button";
import { MapPlaceholder } from "@/components/layout/map-placeholder";
import { MapZoomControls } from "@/components/layout/map-zoom-controls";
import { MapSidePanel } from "@/components/layout/map-side-panel";
import { UnitPanel } from "@/components/layout/unit-panel";
import { Button } from "@/components/core/button";
import { DataText } from "@/components/core/data-text";
import { QueueRow } from "@/components/core/queue-row";
import { EmptyState, LastUpdated } from "@/components/core/system-states";
import { InspectionOverlay } from "@/pages/inspection-overlay";
import { CONSENT_TO_UNIT_STATUS, HOUSE_TYPE } from "@/config/domain";
import { formatDay } from "@/lib/inspection";
import {
  createInitialUnits,
  doneCount,
  isBuildingDone,
  todayDay,
  unitLabel,
  type UnitRow,
} from "@/lib/units";
import { HOUSEHOLDS } from "@/mock/sample";

/**
 * 아키타입 B3 — /field 주택/가구 선택 (드릴다운 3/3).
 * 도시: 격자 확대 지도 + 방문 큐. 농촌(?rural=1): 격자 단계를 건너뛰고
 * 동 전체 가구 색핀 — 브레드크럼 경로가 짧아진다.
 */
export default function FieldUnitsPage() {
  const [params] = useSearchParams();
  const rural = params.get("rural") === "1";
  /**
   * 세대(호) 목록이 완료 판정의 단일 진실원본 — 건물 완료는 여기서 파생한다.
   * 저장 1회 = 건물 완료였던 과거 모델에선 다가구의 나머지 세대가 큐에서 사라졌다.
   */
  const [unitsByRank, setUnitsByRank] = useState(() =>
    Object.fromEntries(HOUSEHOLDS.map((h) => [h.rank, createInitialUnits(h)])),
  );
  /** 큐 행 아래 액션 드롭다운(길찾기·세대 보기)이 열린 행 */
  const [selectedRank, setSelectedRank] = useState<number | null>(null);
  /** 세대 목록 패널 오픈 대상 */
  const [openRank, setOpenRank] = useState<number | null>(null);
  /** 점검 폼은 세대 단위로만 열린다 */
  const [inspecting, setInspecting] = useState<{ rank: number; unitIndex: number } | null>(null);
  const [query, setQuery] = useState("");
  /* 큐는 고정 목록 — 재조회는 백엔드 연동 시. 지금은 갱신 시각만 되돌린다. */
  const [updatedSeconds, setUpdatedSeconds] = useState(7);

  /* 공백 무시 매칭 — "은천로39길"처럼 붙여 치는 입력도 잡는다 */
  const q = query.trim().replace(/\s/g, "");
  const visible = q
    ? HOUSEHOLDS.filter((h) => h.address.replace(/\s/g, "").includes(q))
    : HOUSEHOLDS;

  const openItem = HOUSEHOLDS.find((h) => h.rank === openRank) ?? null;
  const inspectItem = HOUSEHOLDS.find((h) => h.rank === inspecting?.rank) ?? null;
  const inspectUnit =
    inspecting && unitsByRank[inspecting.rank]?.[inspecting.unitIndex];
  const doneBuildings = HOUSEHOLDS.filter((h) => isBuildingDone(unitsByRank[h.rank])).length;

  const patchUnit = (rank: number, index: number, patch: Partial<UnitRow>) =>
    setUnitsByRank((prev) => ({
      ...prev,
      [rank]: prev[rank].map((u, i) => (i === index ? { ...u, ...patch } : u)),
    }));

  /** 주소 아래 보조줄 — 최근 점검일 · 보급일(있을 때만) · 주택유형 */
  const captionOf = (item: (typeof HOUSEHOLDS)[number]) => {
    const inspected = formatDay(item.lastInspectedDay);
    const installed = formatDay(item.installDay);
    return [
      inspected ?? "점검이력 없음",
      installed && `보급 ${installed}`,
      HOUSE_TYPE[item.houseType].label,
    ]
      .filter(Boolean)
      .join(" · ");
  };

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

      {/* 좌 지도 + 우 리사이즈 패널 2열 (접기 가능) — relative는 접힘 탭 앵커용 */}
      <main className="relative flex min-h-0 flex-1 gap-3 p-3">
        {/* 지도 열 — 세대 패널의 앵커. MapPlaceholder는 role="img"·overflow-hidden이라
            대화형 패널을 그 안에 넣지 않고 이 래퍼에 절대배치한다. */}
        <div className="relative flex min-w-0 flex-1">
          <MapPlaceholder
            label={
              rural
                ? "임실읍 — 가구 3구간 색핀 (2단계 진입)"
                : "격자 GA-0412 확대 — 주택 3구간 색핀 · 완료 체크"
            }
            focusedRank={openRank ?? selectedRank}
            className="min-w-0"
          >
            {/* 범례는 우상단 — 하단은 줌(좌)·현재 위치(중앙) 차지 (B1과 동일 배치) */}
            <Legend className="absolute top-3 right-3" />
            <MapZoomControls />
            <LocateButton />
          </MapPlaceholder>

          {/* 세대 목록 — right-3이 큐 패널 접기 탭 pill 바로 앞이라 탭을 가리지 않는다 */}
          {openItem && (
            <UnitPanel
              key={openItem.rank} // 건물 전환 시 패널 내부 세대 선택 리셋
              item={openItem}
              units={unitsByRank[openItem.rank]}
              onClose={() => setOpenRank(null)}
              onInspect={(unitIndex) => setInspecting({ rank: openItem.rank, unitIndex })}
              onRenameUnit={(index, hoNm) => patchUnit(openItem.rank, index, { hoNm })}
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
                  {doneBuildings}/{HOUSEHOLDS.length}
                </DataText>
              </span>
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="새로고침"
                  onClick={() => setUpdatedSeconds(0)}
                  className="flex size-11 items-center justify-center rounded-md text-body hover:bg-surface-muted"
                >
                  <RotateCw aria-hidden className="size-4" />
                </button>
                <LastUpdated seconds={updatedSeconds} />
              </span>
            </span>
          </div>

          {/* 주소 검색 — 방문 큐 실시간 필터 (shrink-0: 리스트 높이 고정) */}
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
            {visible.length === 0 && (
              <EmptyState
                message="검색과 일치하는 주택이 없습니다"
                actionLabel="검색어 지우기"
                onAction={() => setQuery("")}
              />
            )}
            {visible.map((item) => {
              const units = unitsByRank[item.rank];
              /* 단독·1세대는 완료/전체가 정보값이 없다 → null로 빈 슬롯 (undefined면 StatusTag 폴백) */
              const showProgress = units.length > 1 && item.houseType !== "detached";
              return (
                <Fragment key={item.rank}>
                  <QueueRow
                    item={item}
                    density="field"
                    dimmed={isBuildingDone(units)}
                    selected={selectedRank === item.rank}
                    onSelect={() =>
                      setSelectedRank((prev) => (prev === item.rank ? null : item.rank))
                    }
                    caption={captionOf(item)}
                    trailing={
                      showProgress ? (
                        <DataText className="text-body">
                          {doneCount(units)}/{units.length}
                        </DataText>
                      ) : null
                    }
                  />
                  {/* 액션 행 — QueueRow가 <button>이라 버튼 중첩 불가 → 형제로 렌더 */}
                  {selectedRank === item.rank && (
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
                        onClick={() => setOpenRank(item.rank)}
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
            patchUnit(inspecting.rank, inspecting.unitIndex, {
              status: CONSENT_TO_UNIT_STATUS[consent],
              lastInspectedDay: todayDay(), // 방문한 날이 곧 그 세대의 마지막 점검일
            });
          }
          setInspecting(null);
        }}
      />
    </div>
  );
}
