import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { TopBar } from "@/components/layout/top-bar";
import { ControlTabs } from "@/components/layout/control-tabs";
import { Button } from "@/components/core/button";
import { DataText } from "@/components/core/data-text";
import { RegionSelector, type RegionValue } from "@/components/core/region-selector";
import { RX, type RxCode } from "@/config/domain";
import { getDashboardSummary, getSidos, getSigungus } from "@/api/queries";
import { useApiQuery } from "@/api/use-api-query";
import type { ControlScope } from "@/lib/use-control-scope";
import type { DashboardSummary } from "@/api/types";

/** 다크 요약 바의 카운터 — 시스템의 유일한 다크 서피스 (DESIGN.md Colors/Surface) */
function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-caption text-on-dark-soft">{label}</span>
      <DataText className="text-data-lg text-on-dark">{value.toLocaleString()}</DataText>
    </div>
  );
}

/** 예상 소요 = 미완료 세대의 처방별 합. 처방 없는 건물의 세대는 서버가 빼고 준다. */
function pendingTotal(summary: DashboardSummary | undefined): number {
  return Object.values(summary?.pendingByRxCode ?? {}).reduce((sum, n) => sum + n, 0);
}

/** 소요가 한 코드로만 몰려 있으면 코드명을 밝힌다 — 실데이터는 전량 RX-IOT다. */
function pendingLabel(summary: DashboardSummary | undefined): string {
  const used = Object.entries(summary?.pendingByRxCode ?? {}).filter(([, n]) => n > 0);
  return used.length === 1 ? `예상 소요 · ${RX[used[0][0] as RxCode].label}` : "예상 소요";
}

/**
 * 아키타입 A — /control 관제 레이아웃 (데스크톱 ≥1280 / 검증 기준 1024×768).
 *
 * 관제는 **개별 건물을 가리키지 않는다** — 짚는 순간 /field의 데스크톱판이 된다.
 * 드릴다운의 종점은 동이고 그 아래는 '현장모드로 전환'이 받는다.
 *
 * 지역 셀렉터와 요약 바를 레이아웃이 들고 자식 탭이 `<Outlet />`으로 들어온다 —
 * 조회 훅이 탭 전환에 언마운트되지 않아 캐시 없이도 숫자가 깜빡이지 않는다(ADR-004 §1 v2.0).
 */
export default function ControlLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  /* 값은 행정표준코드다. 관제는 시군구까지만 고르고 동은 표·지도에서 고른다 */
  const [region, setRegion] = useState<RegionValue>({ sido: "11", sigungu: "11620" });
  const isOverview = location.pathname.replace(/\/$/, "") === "/control";

  const summary = useApiQuery(region.sigungu ? `summary:${region.sigungu}` : null, (s) =>
    getDashboardSummary(region.sigungu, s),
  );
  const sidos = useApiQuery("sidos", (s) => getSidos(s));
  const sigungus = useApiQuery(region.sido ? `sigungus:${region.sido}` : null, (s) =>
    getSigungus(region.sido!, s),
  );
  const sidoNm = sidos.data?.find((r) => r.sidoCd === region.sido)?.sidoNm;
  const sigunguNm = sigungus.data?.find((r) => r.sigunguCd === region.sigungu)?.sigunguNm;

  return (
    <div className="flex h-dvh flex-col">
      <TopBar mode="control" />

      {/* 탭바 — 좌 탭 / 우 관할 스코프. 범례는 지도 카드 안 플로팅으로 옮겼다 */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-hairline bg-surface px-4 py-2">
        <ControlTabs />
        <RegionSelector
          value={region}
          onChange={setRegion}
          density="control"
          autoSelect={isOverview ? "sigungu" : "none"}
          levels="sigungu"
          allowAllSigungu={!isOverview}
          className="ml-auto"
        />
        <Button variant="primary" onClick={() => navigate("/field")}>
          현장모드로 전환
        </Button>
      </div>

      {/* 분석 화면은 1024×768에서 반드시 스크롤이 생긴다 — 스코프·총량은 고정 */}
      <main className="min-h-0 flex-1 overflow-y-auto p-3">
        <Outlet
          context={
            {
              sidoCd: region.sido,
              sidoNm,
              sigunguCd: region.sigungu,
              sigunguNm,
              summary: summary.data,
            } satisfies ControlScope
          }
        />
      </main>

      {/* 하단 요약 바 — 유일한 다크 서피스이자 KPI를 말하는 유일한 자리 */}
      <footer className="flex h-16 shrink-0 items-center gap-6 bg-surface-dark px-6 xl:gap-10">
        {/* 대상·완료·소요는 세대 축, 위험 등급은 건물 축이다 (docs/openapi.yaml H-3) */}
        <Counter label="대상 세대" value={summary.data?.targetCount ?? 0} />
        <Counter label="위험 등급 주택" value={summary.data?.dangerCount ?? 0} />
        <Counter label={pendingLabel(summary.data)} value={pendingTotal(summary.data)} />
        <Counter label="점검 완료" value={summary.data?.doneCount ?? 0} />
        <span className="ml-auto text-caption text-on-dark-soft">
          {sigunguNm ?? sidoNm ?? "관할 미선택"}
        </span>
      </footer>
    </div>
  );
}
