import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/core/button";
import { DataText } from "@/components/core/data-text";
import { EstimateBorder } from "@/components/core/estimate-border";
import { HonestyLabel } from "@/components/core/honesty-label";
import { QueueRow } from "@/components/core/queue-row";
import { RegionSelector, type RegionValue } from "@/components/core/region-selector";
import { RiskBadge } from "@/components/core/risk-badge";
import { StatusTag } from "@/components/core/status-tag";
import {
  EmptyState,
  ErrorInline,
  LastUpdated,
  OfflineBar,
  RowSkeleton,
} from "@/components/core/system-states";
import { Legend } from "@/components/layout/legend";
import { VISIT_STATUS, type VisitStatus } from "@/config/domain";
import { HOUSEHOLDS } from "@/mock/sample";
import { cn } from "@/lib/utils";

/*
 * 데모 전용 상태 시뮬레이션 클래스 — Hover/Focus를 화면에 정적으로 나열하기
 * 위한 강제 표시이며, 실제 컴포넌트 상태 문법은 DESIGN.md Interaction States의
 * 공통 정의(전역 :focus-visible 링, hover 배경 틴트)를 따른다.
 */
const FOCUS_SIM = "outline-2 outline-solid outline-offset-2 outline-focus";
const STATES = ["Default", "Hover", "Focus", "Active·Selected", "Disabled"] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-hairline bg-surface p-6">
      <h2 className="mb-4 text-title text-ink">{title}</h2>
      {children}
    </section>
  );
}

function StateMatrix({
  render,
}: {
  render: (state: (typeof STATES)[number]) => React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      {STATES.map((s) => (
        <div key={s} className="space-y-2">
          <p className="text-caption text-subtle">{s}</p>
          {render(s)}
        </div>
      ))}
    </div>
  );
}

export default function DemoPage() {
  const [region, setRegion] = useState<RegionValue>({ sido: "seoul" });
  const item = HOUSEHOLDS[0];
  const estimatedItem = HOUSEHOLDS[1];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-display text-ink">다울림 디자인 하네스 — 데모</h1>
        <p className="text-body-md text-body">
          코어 8종 · 인터랙티브 5상태 · 시스템 4상태. 정본은 frontend/DESIGN.md.
        </p>
        <nav className="flex flex-wrap gap-3 text-body-sm">
          {[
            ["/control", "A 관제"],
            ["/field", "B1 동 선택"],
            ["/field/grid", "B2 격자 선택"],
            ["/field/units", "B3 주택 선택 (+C 오버레이)"],
            ["/field/units?rural=1", "B3 농촌 분기"],
          ].map(([to, label]) => (
            <Link key={to} to={to} className="text-brand underline underline-offset-4">
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <Section title="1. Button — primary / secondary / danger × md(40px) / field-xl(64px)">
        <div className="space-y-6">
          {(["primary", "secondary", "danger"] as const).map((variant) => (
            <StateMatrix
              key={variant}
              render={(s) => (
                <Button
                  variant={variant}
                  size="md"
                  disabled={s === "Disabled"}
                  className={
                    s === "Focus"
                      ? FOCUS_SIM
                      : s === "Hover" || s === "Active·Selected"
                        ? variant === "primary"
                          ? "bg-brand-hover"
                          : variant === "secondary"
                            ? "bg-surface-muted"
                            : "bg-risk-danger/90"
                        : undefined
                  }
                >
                  {variant}
                </Button>
              )}
            />
          ))}
          <div className="flex flex-wrap items-end gap-4">
            <Button size="md">md 40px</Button>
            <Button size="field-xl">field-xl 64px (장갑 착용)</Button>
          </div>
        </div>
      </Section>

      <Section title="2. StatusTag — 상태명은 config/domain.ts에서만 주입 (모델 미합의)">
        <div className="mb-4 flex flex-wrap gap-3">
          {(Object.keys(VISIT_STATUS) as VisitStatus[]).map((s) => (
            <StatusTag key={s} status={s} />
          ))}
        </div>
        <StateMatrix
          render={(s) => (
            <span
              className={
                s === "Focus"
                  ? `inline-flex rounded-full ${FOCUS_SIM}`
                  : s === "Disabled"
                    ? "inline-flex opacity-50"
                    : "inline-flex"
              }
            >
              <StatusTag
                status="pending"
                className={
                  s === "Hover"
                    ? "bg-surface-muted"
                    : s === "Active·Selected"
                      ? "outline-1 outline-brand"
                      : undefined
                }
              />
            </span>
          )}
        />
      </Section>

      <Section title="3. RiskBadge — 색 + 라벨 + 수치 병기 (색 단독 금지)">
        <div className="mb-4 flex flex-wrap gap-3">
          <RiskBadge level="danger" score={91.2} />
          <RiskBadge level="warn" score={58.3} />
          <RiskBadge level="ok" score={22.7} />
          <RiskBadge level="danger" score={84.6} estimated />
        </div>
        <StateMatrix
          render={(s) => (
            <span
              className={
                s === "Focus"
                  ? `inline-flex rounded-sm ${FOCUS_SIM}`
                  : s === "Disabled"
                    ? "inline-flex opacity-50"
                    : "inline-flex"
              }
            >
              <RiskBadge
                level="danger"
                score={91.2}
                className={
                  s === "Hover"
                    ? "bg-risk-danger-line/40"
                    : s === "Active·Selected"
                      ? "outline-1 outline-risk-danger"
                      : undefined
                }
              />
            </span>
          )}
        />
      </Section>

      <Section title="4. DataText — 값=mono / 라벨=sans 경계">
        <p className="text-body-md text-body">
          격자 <DataText>GA-0412</DataText>의 위험 점수는 <DataText>91.2</DataText>,
          처방 코드는 <DataText>RX-BAT</DataText>, 좌표{" "}
          <DataText>37.4784, 126.9516</DataText>
        </p>
      </Section>

      <Section title="5. EstimateBorder — 실선=실측 / 점선=추정 (형태로 구분)">
        <div className="grid gap-4 md:grid-cols-2">
          <EstimateBorder kind="measured">
            <span className="text-body-sm text-body">
              보급연차 <DataText>2016</DataText> — 점검 대장 실측
            </span>
          </EstimateBorder>
          <EstimateBorder kind="estimated">
            <span className="text-body-sm text-body">
              보급연차 <DataText>2017</DataText> — 보급 대장 기반
            </span>
          </EstimateBorder>
        </div>
        <Legend className="mt-4" />
      </Section>

      <Section title="6. QueueRow — 행 높이 고정 (control 48px / field 64px)">
        <div className="space-y-2">
          {STATES.map((s) => (
            <div key={s}>
              <p className="mb-1 text-caption text-subtle">{s}</p>
              <div
                className={cn(
                  "overflow-hidden rounded-md border border-hairline",
                  s === "Focus" && FOCUS_SIM,
                )}
              >
                <QueueRow
                  item={s === "Active·Selected" ? item : estimatedItem}
                  density="control"
                  selected={s === "Active·Selected"}
                  disabled={s === "Disabled"}
                  className={s === "Hover" ? "bg-surface-muted" : undefined}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 overflow-hidden rounded-md border border-hairline">
          <QueueRow item={item} density="field" />
        </div>
      </Section>

      <Section title="7. RegionSelector — 시·도 → 시·군·구 → 읍·면·동 (상위 변경 시 하위 리셋)">
        <div className="space-y-4">
          <RegionSelector value={region} onChange={setRegion} density="control" />
          <StateMatrix
            render={(s) => (
              <RegionSelector
                value={
                  s === "Active·Selected"
                    ? { sido: "seoul", sigungu: "gwanak", dong: "eunhcheon" }
                    : s === "Disabled"
                      ? {}
                      : { sido: "seoul" }
                }
                onChange={() => {}}
                density="control"
                className={
                  s === "Focus"
                    ? "[&_[data-slot=select-trigger]:first-of-type]:outline-2 [&_[data-slot=select-trigger]:first-of-type]:outline-solid [&_[data-slot=select-trigger]:first-of-type]:outline-offset-2 [&_[data-slot=select-trigger]:first-of-type]:outline-focus"
                    : s === "Hover"
                      ? "[&_[data-slot=select-trigger]]:bg-surface-muted"
                      : undefined
                }
              />
            )}
          />
        </div>
      </Section>

      <Section title="8. HonestyLabel — 정직성 라벨 상설 컴포넌트">
        <div className="space-y-3">
          <HonestyLabel />
          <HonestyLabel>추정 보급연차 기반 순위입니다 — 현장 확인 후 갱신됩니다</HonestyLabel>
        </div>
      </Section>

      <Section title="시스템 상태 4종 — Loading / Empty / Error / Offline (표준 패턴·문구)">
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-caption text-subtle">
              Loading — 자리 유지형 (이전 데이터 + 타임스탬프) · 첫 로드만 스켈레톤
            </p>
            <div className="mb-2">
              <LastUpdated seconds={7} />
            </div>
            <div className="overflow-hidden rounded-md border border-hairline">
              <RowSkeleton density="control" rows={2} />
            </div>
          </div>
          <div>
            <p className="mb-2 text-caption text-subtle">Empty</p>
            <div className="rounded-md border border-hairline">
              <EmptyState />
            </div>
          </div>
          <div>
            <p className="mb-2 text-caption text-subtle">Error — 인라인 바, 화면 전환 아님</p>
            <ErrorInline />
          </div>
          <div>
            <p className="mb-2 text-caption text-subtle">
              Offline — 저장 실패는 이 플로우로 수렴 (로컬 보관 + 재전송)
            </p>
            <OfflineBar />
          </div>
        </div>
      </Section>
    </div>
  );
}
