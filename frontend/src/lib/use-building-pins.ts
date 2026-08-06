import { useEffect, useRef } from "react";
import type { BuildingQueueItem } from "@/api/types";
import { RISK_LEVEL, type RiskLevel } from "@/config/domain";
import { isQueueItemDone } from "@/lib/units";

/**
 * 건물 핀 레이어 — **보이는 영역만 그린다**.
 *
 * 격자 하나에 최대 975건, 관악구 전체 22,501건이라 전량을 개별 마커로 찍으면 브라우저가 죽는다.
 * 클러스터링(`MarkerClustering.js`)은 코어 SDK에 없어 파일을 벤더링해야 하는데, 우리는 이미
 * 격자로 드릴다운한 뒤라 한 화면에 뜨는 건물이 수백 건 수준이다 — 의존성 0으로 충분하다.
 *
 * 큐 자체도 `size=100`으로 끊겨 오므로 핀은 그보다 많아지지 않는다. 뷰포트 필터는 그 위에서
 * DOM 노드와 시각적 혼잡을 더 줄이는 층이다.
 */
const RISK_CLASS: Record<RiskLevel, { dot: string; text: string }> = {
  danger: { dot: "bg-risk-danger", text: "text-risk-danger" },
  warn: { dot: "bg-risk-warn", text: "text-risk-warn" },
  ok: { dot: "bg-risk-ok", text: "text-risk-ok" },
};

/**
 * 핀 모양 — 본색 채움 + 흰 테두리(DESIGN.md §지도 핀).
 *
 * **등급 라벨·점수는 선택했을 때 말풍선으로 병기한다.** 규칙이 요구하는 "핀 옆 또는 말풍선" 중
 * 말풍선 쪽을 택한 이유는 밀집 때문이다 — 한 격자에 수백 건이라 모든 핀에 라벨을 붙이면
 * 라벨끼리 겹쳐 아무것도 읽을 수 없다. 병기를 없앤 게 아니라 읽히는 시점으로 옮긴 것이다.
 */
function pinContent(item: BuildingQueueItem, selected: boolean): string {
  const risk = RISK_CLASS[item.riskLevelCd];
  const label = RISK_LEVEL[item.riskLevelCd].label;
  const dimmed = isQueueItemDone(item) ? "opacity-50" : "";

  const bubble = selected
    ? `<span class="whitespace-nowrap rounded-full border border-brand bg-surface px-1.5 py-0.5 text-caption shadow-e2 ${risk.text}">
         ${label} ${item.score.toFixed(1)}
       </span>`
    : "";

  /* 선택한 핀은 조금 키워 목록에서 고른 집이 지도에서 바로 눈에 띄게 한다 */
  const dot = selected
    ? `size-4 border-2 border-brand ring-2 ring-surface`
    : `size-3 border-2 border-surface`;

  return `
    <div class="flex -translate-x-1/2 -translate-y-full flex-col items-center gap-0.5 ${dimmed}">
      ${bubble}
      <span class="rounded-full shadow-e1 ${dot} ${risk.dot}"></span>
    </div>`;
}

export function useBuildingPins(
  map: naver.maps.Map | null,
  items: BuildingQueueItem[],
  options: { selectedId: number | null; onSelect: (buildingId: number) => void },
) {
  const markers = useRef(new Map<number, naver.maps.Marker>());
  /* 콜백·선택값이 매 렌더 바뀌어도 리스너를 다시 달지 않는다 */
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!map) return;
    const pool = markers.current;

    const sync = () => {
      const bounds = map.getBounds() as naver.maps.LatLngBounds;
      const visible = new Set<number>();

      for (const item of items) {
        if (!bounds.hasLatLng(new naver.maps.LatLng(item.lat, item.lng))) continue;
        visible.add(item.buildingId);

        const selected = optionsRef.current.selectedId === item.buildingId;
        const existing = pool.get(item.buildingId);
        if (existing) {
          existing.setIcon({ content: pinContent(item, selected) });
          continue;
        }

        const marker = new naver.maps.Marker({
          map,
          position: new naver.maps.LatLng(item.lat, item.lng),
          icon: { content: pinContent(item, selected) },
          // 위험한 집이 위로 오게 — 겹칠 때 가려지면 안 되는 쪽이 위다
          zIndex: Math.round(item.score),
        });
        marker.addListener("click", () => optionsRef.current.onSelect(item.buildingId));
        pool.set(item.buildingId, marker);
      }

      /* 화면을 벗어난 핀은 지운다 — 지도에서 떼야 DOM 노드도 사라진다 */
      for (const [id, marker] of pool) {
        if (!visible.has(id)) {
          marker.setMap(null);
          pool.delete(id);
        }
      }
    };

    sync();
    const listener = map.addListener("idle", sync);
    return () => {
      map.removeListener(listener);
      for (const marker of pool.values()) marker.setMap(null);
      pool.clear();
    };
  }, [map, items, options.selectedId]);
}
