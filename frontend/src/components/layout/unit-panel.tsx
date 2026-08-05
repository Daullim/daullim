import { useState } from "react";
import { XIcon } from "lucide-react";
import { HOUSE_TYPE, OWNERSHIP_LABEL } from "@/config/domain";
import { Button } from "@/components/core/button";
import { DataText } from "@/components/core/data-text";
import { EstimateBorder } from "@/components/core/estimate-border";
import { StatusTag } from "@/components/core/status-tag";
import { formatDay, parseUseApr } from "@/lib/inspection";
import { doneCount, isRenameable, unitLabel } from "@/lib/units";
import type { BuildingDetail, UnitItem } from "@/api/types";
import { cn } from "@/lib/utils";

/** 대장 프리필 한 칸 — 라벨 위, 값 아래 */
function PrefillCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-caption font-normal text-subtle">{label}</dt>
      <dd className="text-body-md text-ink">{children}</dd>
    </div>
  );
}

/**
 * 세대(호) 목록 — 지도 위 우측 플로팅 패널 (B3).
 * 구성: 헤더(닫기·주소) → 건축물대장 프리필 고정 → 세대 라디오 목록 → 하단 고정 점검하기.
 * 대장 프리필은 점검 폼의 구 Step 1에서 이관된 것 — 건물 정보라 세대 목록 위가 제자리다.
 */
export function UnitPanel({
  building,
  units,
  onClose,
  onInspect,
  onRenameUnit,
  renameError,
  className,
}: {
  building: BuildingDetail;
  units: UnitItem[];
  onClose: () => void;
  onInspect: (unitId: number) => void;
  /** 다가구 — 전유부에 호 목록이 없어 현장에서 직접 입력. 확정(blur·Enter) 시에만 부른다 */
  onRenameUnit: (unitId: number, hoNm: string) => void;
  /** 서버가 되돌린 사유 — 중복 호수(409)나 대장 행 수정 시도(403) */
  renameError?: string;
  className?: string;
}) {
  const house = HOUSE_TYPE[building.houseTypeCd];
  // 표제부 사용승인일 → 건축연월·준공연차. 대장 미등재면 null.
  const approval = parseUseApr(building.useAprDay);
  const done = doneCount(units);

  /* 선택은 패널 로컬 상태 — 건물 전환은 호출부의 key가 리마운트로 처리한다 */
  const [selectedId, setSelectedId] = useState<number | null>(null);
  /* 호수 입력 초안 — 타이핑마다 PATCH를 보내지 않기 위해 확정 전까지 여기 머문다 */
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const selectedUnit = units.find((u) => u.unitId === selectedId);
  const needsHoNm = !!selectedUnit && !selectedUnit.hoNm?.trim();

  const commitRename = (unit: UnitItem) => {
    const draft = drafts[unit.unitId];
    if (draft === undefined) return;
    const trimmed = draft.trim();
    if (!trimmed || trimmed === unit.hoNm) return;
    onRenameUnit(unit.unitId, trimmed);
  };

  return (
    <aside
      aria-label={`${building.address} 세대 목록`}
      className={cn(
        "flex w-80 max-w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-md border border-hairline bg-surface shadow-e2",
        className,
      )}
    >
      {/* 헤더 — 좌상단 닫기(다방식) */}
      <div className="flex shrink-0 items-start gap-2 border-b border-hairline p-3">
        <button
          type="button"
          aria-label="세대 목록 닫기"
          onClick={onClose}
          className="flex size-11 shrink-0 items-center justify-center rounded-md text-ink hover:bg-surface-muted"
        >
          <XIcon aria-hidden className="size-5" />
        </button>
        <div className="min-w-0 flex-1 pt-1.5">
          <h2 className="truncate text-title-sm text-ink">{building.address}</h2>
          <p className="text-caption text-subtle">
            완료{" "}
            <DataText>
              {done}/{units.length}
            </DataText>
          </p>
        </div>
      </div>

      {/* 건축물대장 프리필 — 실측(실선). 320px 폭에 맞춰 2열로 재배치 */}
      <div className="shrink-0 space-y-1 border-b border-hairline p-3">
        <EstimateBorder kind="measured">
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
            <PrefillCell label="주택 유형">
              {house.label}
              <span className="block text-caption text-subtle">
                {OWNERSHIP_LABEL[house.ownership]}
              </span>
            </PrefillCell>
            <PrefillCell label="층수">
              <DataText>{building.floorCount}</DataText>층
            </PrefillCell>
            <PrefillCell label="세대수">
              <DataText>{building.unitCount}</DataText>세대
            </PrefillCell>
            <PrefillCell label="사용승인일 (준공)">
              {approval ? (
                <>
                  <DataText>{approval.ymLabel}</DataText>
                  <span className="block text-caption text-subtle">
                    준공 <DataText>{approval.years}</DataText>년차
                  </span>
                </>
              ) : (
                <span className="text-subtle">미등재</span>
              )}
            </PrefillCell>
          </dl>
        </EstimateBorder>
        <p className="text-right text-caption text-subtle">건축물대장 표제부 기준</p>
      </div>

      {/* 세대 목록 — 라디오 단일 선택. 다가구는 호수 입력이 있어 행을 button으로 못 만든다 */}
      <ul className="min-h-0 flex-1 overflow-y-auto">
        {units.map((unit) => (
          <li
            key={unit.unitId}
            className={cn(
              "flex min-h-16 items-center gap-2 border-b border-hairline px-3 py-2",
              selectedId === unit.unitId && "bg-brand-tint",
            )}
          >
            <span className="flex size-11 shrink-0 items-center justify-center">
              <input
                type="radio"
                name="unit"
                id={`unit-${unit.unitId}`}
                checked={selectedId === unit.unitId}
                onChange={() => setSelectedId(unit.unitId)}
                aria-label={`${unitLabel(unit)} 선택`}
                className="size-5 accent-brand"
              />
            </span>
            <span className="min-w-0 flex-1">
              {/* 수정 가능 여부는 호수 출처가 정한다 — 서버도 field 행만 허용한다(그 외 403) */}
              {isRenameable(unit) ? (
                <input
                  type="text"
                  value={drafts[unit.unitId] ?? unit.hoNm ?? ""}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [unit.unitId]: e.target.value }))
                  }
                  onFocus={() => setSelectedId(unit.unitId)}
                  onBlur={() => commitRename(unit)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitRename(unit);
                    }
                  }}
                  aria-label={`${unit.unitSeq}번째 세대 호수`}
                  placeholder='예: "201호"'
                  className="h-11 w-full rounded-sm border border-hairline-strong bg-surface px-3 text-body-md text-ink placeholder:text-subtle"
                />
              ) : (
                <label
                  htmlFor={`unit-${unit.unitId}`}
                  className="block truncate text-body-md text-ink"
                >
                  {unitLabel(unit)}
                </label>
              )}
            </span>
            {/* 마지막 점검일 — 상태 태그 왼쪽, 이력 없으면 '미점검' */}
            <span className="shrink-0 text-caption text-subtle">
              {formatDay(unit.lastInspectedDay) ?? "미점검"}
            </span>
            <StatusTag status={unit.statusCd} />
          </li>
        ))}
      </ul>

      {/* 하단 고정 — 세대를 골라야 점검할 수 있다 */}
      <div className="shrink-0 space-y-2 border-t border-hairline p-3">
        {renameError && <p className="text-caption text-risk-danger">{renameError}</p>}
        {needsHoNm && (
          <p className="text-caption text-subtle">호수를 입력해야 점검할 수 있습니다</p>
        )}
        <Button
          variant="primary"
          size="field-xl"
          className="w-full"
          disabled={selectedId == null || needsHoNm}
          onClick={() => selectedId != null && onInspect(selectedId)}
        >
          점검하기
        </Button>
      </div>
    </aside>
  );
}
