import type * as React from "react";
import {
  AGE_BAND,
  ALARM_CHECK,
  BATTERY_TYPE,
  DETECTOR_FLAG,
  EXT_FLAG,
  EXT_LOCATION,
  INSTALLED,
  PRESSURE_STATUS,
  ROOM_LABEL,
  type AgeBand,
  type DetectorFlag,
  type ExtFlag,
  type ExtLocation,
  type RoomLabel,
} from "@/config/domain";
import { Button } from "@/components/core/button";
import { DataText } from "@/components/core/data-text";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChoiceGroup, FormSection } from "@/components/inspection/form-controls";
import type {
  DetectorRow,
  ExtinguisherRow,
  InspectionAction,
  InspectionFormState,
} from "@/lib/inspection";
import type { HouseholdItem } from "@/mock/sample";

/** 연차 구간 폴백 select — 감지기(mfg_ym 입력 시 비활성)·소화기 공용 */
function AgeBandSelect({
  id,
  value,
  disabled,
  onChange,
}: {
  id: string;
  value: AgeBand | null;
  disabled?: boolean;
  onChange: (v: AgeBand) => void;
}) {
  return (
    <Select value={value ?? undefined} disabled={disabled} onValueChange={(v) => onChange(v as AgeBand)}>
      <SelectTrigger id={id} className="h-11 w-full border-hairline-strong">
        <SelectValue placeholder="구간 선택 (추정)" />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(AGE_BAND) as AgeBand[]).map((k) => (
          <SelectItem key={k} value={k}>
            {AGE_BAND[k].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** 2-A 감지기 행 — 예외 기반 입력: 예외인 실만 수정한다 */
function DetectorRowCard({
  index,
  row,
  dispatch,
}: {
  index: number;
  row: DetectorRow;
  dispatch: React.Dispatch<InspectionAction>;
}) {
  const patch = (p: Partial<DetectorRow>) => dispatch({ type: "SET_DETECTOR", index, patch: p });

  return (
    <div className="space-y-3 rounded-md border border-hairline-strong p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-body-md text-ink">
          실 <DataText>{index + 1}</DataText>
        </span>
        <Select value={row.roomLabel} onValueChange={(v) => patch({ roomLabel: v as RoomLabel })}>
          <SelectTrigger aria-label={`실 ${index + 1} 이름`} className="h-11 border-hairline-strong">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(ROOM_LABEL) as RoomLabel[]).map((k) => (
              <SelectItem key={k} value={k}>
                {ROOM_LABEL[k].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ChoiceGroup
        options={INSTALLED}
        value={row.installed}
        onChange={(v) => patch({ installed: v })}
        columns={2}
        ariaPrefix={`실 ${index + 1} 설치 여부`}
      />

      {row.installed === "missing" && (
        <p className="rounded-sm bg-surface-muted px-3 py-2 text-body-sm text-body">
          미설치 — 처방 <DataText>RX-IOT</DataText>(설치 권고)로 자동 분기, 이하 입력 생략
        </p>
      )}

      {row.installed === "installed" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-body-sm text-body" htmlFor={`det-mfg-${index}`}>
                제조년월 (라벨 실측 우선)
              </label>
              <input
                id={`det-mfg-${index}`}
                type="month"
                value={row.mfgYm ?? ""}
                onChange={(e) => patch({ mfgYm: e.target.value === "" ? null : e.target.value })}
                className="h-11 w-full rounded-sm border border-hairline-strong bg-surface px-3 text-body-md text-ink"
              />
            </div>
            <div>
              <label className="mb-2 block text-body-sm text-body" htmlFor={`det-age-${index}`}>
                연차 구간 (판독 불가 시)
              </label>
              <AgeBandSelect
                id={`det-age-${index}`}
                value={row.ageBand}
                disabled={row.mfgYm !== null}
                onChange={(v) => patch({ ageBand: v })}
              />
            </div>
          </div>

          {/* 작동여부 3-way — 64px (장갑 착용), 기존 ALARM_CHECK 재사용 */}
          <fieldset>
            <legend className="mb-2 text-body-sm text-body">작동 여부 (필수)</legend>
            <ChoiceGroup
              options={ALARM_CHECK}
              value={row.actuation}
              onChange={(v) => patch({ actuation: v, ...(v !== "battery-dead" ? { batteryType: null } : {}) })}
              size="lg"
              columns={3}
              ariaPrefix={`실 ${index + 1} 작동 여부`}
            />
          </fieldset>

          {row.actuation === "battery-dead" && (
            <fieldset>
              <legend className="mb-2 text-body-sm text-body">
                전지 유형 (필수) — 일체형은 기기 교체(RX-IOT)로 분기
              </legend>
              <ChoiceGroup
                options={BATTERY_TYPE}
                value={row.batteryType}
                onChange={(v) => patch({ batteryType: v })}
                columns={3}
                ariaPrefix={`실 ${index + 1} 전지 유형`}
              />
            </fieldset>
          )}

          <label className="flex min-h-11 items-center gap-2 text-body-md text-ink">
            <input
              type="checkbox"
              checked={row.hasIssue}
              onChange={() => patch({ hasIssue: !row.hasIssue, ...(row.hasIssue ? { flags: [] } : {}) })}
              className="size-5 accent-brand"
            />
            외관 이상 있음
          </label>
          {row.hasIssue && (
            <fieldset className="space-y-2 rounded-sm bg-surface-muted p-3">
              <legend className="sr-only">외관 상태 (다중선택)</legend>
              {(Object.keys(DETECTOR_FLAG) as DetectorFlag[]).map((f) => (
                <label key={f} className="flex min-h-11 items-center gap-2 text-body-md text-ink">
                  <input
                    type="checkbox"
                    checked={row.flags.includes(f)}
                    onChange={() =>
                      patch({
                        flags: row.flags.includes(f)
                          ? row.flags.filter((x) => x !== f)
                          : [...row.flags, f],
                      })
                    }
                    className="size-5 accent-brand"
                  />
                  {DETECTOR_FLAG[f].label}
                </label>
              ))}
              <p className="text-caption text-subtle">※ 배선형 자탐설비 기준 준용</p>
            </fieldset>
          )}
        </>
      )}
    </div>
  );
}

/** 2-B 소화기 행 — 기본 1행 + 추가 (간소화: 정밀 제조년월 없이 구간 추정 유지) */
function ExtinguisherRowCard({
  index,
  row,
  dispatch,
}: {
  index: number;
  row: ExtinguisherRow;
  dispatch: React.Dispatch<InspectionAction>;
}) {
  const patch = (p: Partial<ExtinguisherRow>) =>
    dispatch({ type: "SET_EXTINGUISHER", index, patch: p });

  return (
    <div className="space-y-3 rounded-md border border-hairline-strong p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-body-md text-ink">
          소화기 <DataText>{index + 1}</DataText>
        </span>
        <Select value={row.location} onValueChange={(v) => patch({ location: v as ExtLocation })}>
          <SelectTrigger aria-label={`소화기 ${index + 1} 설치 위치`} className="h-11 border-hairline-strong">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(EXT_LOCATION) as ExtLocation[]).map((k) => (
              <SelectItem key={k} value={k}>
                {EXT_LOCATION[k].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ChoiceGroup
        options={INSTALLED}
        value={row.installed}
        onChange={(v) => patch({ installed: v })}
        columns={2}
        ariaPrefix={`소화기 ${index + 1} 설치 여부`}
      />

      {row.installed === "missing" && (
        <p className="rounded-sm bg-surface-muted px-3 py-2 text-body-sm text-body">
          미설치 — 설치 권고로 자동 분기, 이하 입력 생략
        </p>
      )}

      {row.installed === "installed" && (
        <>
          <div>
            <label className="mb-2 block text-body-sm text-body" htmlFor={`ext-age-${index}`}>
              제조·설치 연차 (용기 각인 확인 우선)
            </label>
            <AgeBandSelect
              id={`ext-age-${index}`}
              value={row.ageBand}
              onChange={(v) => patch({ ageBand: v })}
            />
          </div>

          <fieldset>
            <legend className="mb-2 text-body-sm text-body">지시압력계 상태 (필수)</legend>
            <ChoiceGroup
              options={PRESSURE_STATUS}
              value={row.pressure}
              onChange={(v) => patch({ pressure: v })}
              columns={2}
              ariaPrefix={`소화기 ${index + 1} 지시압력계`}
            />
            {row.pressure === "no-gauge" && (
              <p className="mt-2 text-caption text-risk-danger">
                가압식 의심 — 노후 시 폭발 사고 이력, 무조건 불량 판정 + 즉시 교체·회수 안내
              </p>
            )}
          </fieldset>

          <label className="flex min-h-11 items-center gap-2 text-body-md text-ink">
            <input
              type="checkbox"
              checked={row.hasIssue}
              onChange={() => patch({ hasIssue: !row.hasIssue, ...(row.hasIssue ? { flags: [] } : {}) })}
              className="size-5 accent-brand"
            />
            외관 이상 있음
          </label>
          {row.hasIssue && (
            <fieldset className="space-y-2 rounded-sm bg-surface-muted p-3">
              <legend className="sr-only">외관 상태 (다중선택)</legend>
              {(Object.keys(EXT_FLAG) as ExtFlag[]).map((f) => (
                <label key={f} className="flex min-h-11 items-center gap-2 text-body-md text-ink">
                  <input
                    type="checkbox"
                    checked={row.flags.includes(f)}
                    onChange={() =>
                      patch({
                        flags: row.flags.includes(f)
                          ? row.flags.filter((x) => x !== f)
                          : [...row.flags, f],
                      })
                    }
                    className="size-5 accent-brand"
                  />
                  {EXT_FLAG[f].label}
                </label>
              ))}
            </fieldset>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Step 2 — 품목별 진단 체크리스트 (감지기 room_count 반복 + 소화기 1행+추가).
 * 촬영/사진 필드 없음 (폼설계 2026-07-24 결정 — 사생활 부담 원천 제거).
 */
export function ChecklistSection({
  item,
  form,
  dispatch,
}: {
  item: HouseholdItem;
  form: InspectionFormState;
  dispatch: React.Dispatch<InspectionAction>;
}) {
  return (
    <FormSection title="Step 2 — 품목별 체크리스트">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-body-md text-ink">단독경보형 감지기</h4>
        <Button
          variant="secondary"
          disabled={form.detectors.length === 0}
          onClick={() => dispatch({ type: "ALL_ROOMS_NORMAL" })}
        >
          모든 실 정상
        </Button>
      </div>

      {form.detectors.length === 0 ? (
        <p className="rounded-sm bg-surface-muted px-3 py-2 text-body-sm text-subtle">
          Step 1의 구획된 실 개수를 입력하면 실별 체크리스트가 생성됩니다
        </p>
      ) : (
        form.detectors.map((row, i) => (
          <DetectorRowCard key={i} index={i} row={row} dispatch={dispatch} />
        ))
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <h4 className="text-body-md text-ink">소화기</h4>
        <Button variant="secondary" onClick={() => dispatch({ type: "ADD_EXTINGUISHER" })}>
          + 추가
        </Button>
      </div>
      <p className="text-caption text-subtle">
        이 세대 기준 소화기 최소 <DataText>{Math.max(1, item.floorCount)}</DataText>개 권장
        (세대별·층별 각 1개 이상)
      </p>
      {form.extinguishers.map((row, i) => (
        <ExtinguisherRowCard key={i} index={i} row={row} dispatch={dispatch} />
      ))}
    </FormSection>
  );
}
