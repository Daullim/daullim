import type * as React from "react";
import { HOUSE_TYPE, OWNERSHIP_LABEL } from "@/config/domain";
import { DataText } from "@/components/core/data-text";
import { EstimateBorder } from "@/components/core/estimate-border";
import { FormSection } from "@/components/inspection/form-controls";
import type { HouseholdItem } from "@/mock/sample";
import type { InspectionAction, InspectionFormState } from "@/lib/inspection";

/**
 * Step 1 — 주택 기본정보 & 대상물 분류.
 * 주택유형·층수·세대수는 건축물대장 표제부 배치 프리필(읽기전용) —
 * 현장 재입력은 대장에 없는 항목(구획된 실 개수)과 불일치 정정에만 남긴다 (폼설계 §0-1).
 */
export function TargetSection({
  item,
  form,
  dispatch,
}: {
  item: HouseholdItem;
  form: InspectionFormState;
  dispatch: React.Dispatch<InspectionAction>;
}) {
  const house = HOUSE_TYPE[item.houseType];

  return (
    <FormSection title="Step 1 — 대상물 분류">
      {/* 건축물대장 프리필 — 실측(대장 기준), 실선 보더 */}
      <EstimateBorder kind="measured">
        <dl className="grid grid-cols-3 gap-x-4 gap-y-1 text-body-sm">
          <div>
            <dt className="text-caption text-subtle">주택 유형</dt>
            <dd className="text-ink">
              {house.label}
              <span className="ml-1.5 text-caption text-subtle">
                {OWNERSHIP_LABEL[house.ownership]}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-caption text-subtle">층수</dt>
            <dd className="text-ink">
              <DataText>{item.floorCount}</DataText>층
            </dd>
          </div>
          <div>
            <dt className="text-caption text-subtle">세대수</dt>
            <dd className="text-ink">
              <DataText>{item.unitCount}</DataText>세대
            </dd>
          </div>
        </dl>
        <p className="mt-2 text-caption text-subtle">건축물대장 표제부 기준 (배치 사전조회)</p>
      </EstimateBorder>

      {/* 실물 불일치 정정 — 정정값 입력은 프리필 API 연동 후 (표시 토글만, no-op) */}
      <label className="flex min-h-11 items-center gap-2 text-body-md text-ink">
        <input
          type="checkbox"
          checked={form.prefillCorrected}
          onChange={() => dispatch({ type: "TOGGLE_PREFILL_CORRECTED" })}
          className="size-5 accent-brand"
        />
        실물과 다름 (무허가 증축·용도변경 등)
      </label>
      {form.prefillCorrected && (
        <p className="rounded-sm bg-surface-muted px-3 py-2 text-caption text-body">
          불일치 표기가 기록됩니다 — 정정값 입력은 건축물대장 연동 후 활성
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-2 block text-body-md text-ink" htmlFor="room-count">
            구획된 실(방) 개수 (필수)
          </label>
          <input
            id="room-count"
            type="number"
            min={1}
            max={9}
            inputMode="numeric"
            value={form.roomCount ?? ""}
            onChange={(e) =>
              dispatch({
                type: "SET_ROOM_COUNT",
                value: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            placeholder="방문 가구 내부 기준"
            className="h-11 w-full rounded-sm border border-hairline-strong bg-surface px-3 text-body-md text-ink placeholder:text-subtle"
          />
        </div>
        <div>
          <label className="mb-2 block text-body-md text-ink" htmlFor="unit-label">
            방문 가구 식별
          </label>
          <input
            id="unit-label"
            type="text"
            value={form.unitLabel}
            onChange={(e) => dispatch({ type: "SET_UNIT_LABEL", value: e.target.value })}
            placeholder='예: "201호", "2층 왼쪽"'
            className="h-11 w-full rounded-sm border border-hairline-strong bg-surface px-3 text-body-md text-ink placeholder:text-subtle"
          />
        </div>
      </div>

      <p className="rounded-sm bg-surface-muted px-3 py-2 text-caption text-body">
        본 점검은 소방시설법 제8조에 따른 주택용 소방시설(단독경보형감지기·소화기)에
        한정됩니다. 승낙 기반 점검이며 강제 사항이 아닙니다.
      </p>
    </FormSection>
  );
}
