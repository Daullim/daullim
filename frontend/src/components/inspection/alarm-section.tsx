import type * as React from "react";
import {
  AGE_BAND,
  BATTERY_TYPE,
  DETECTOR_FLAG,
  REPLACE_REASON,
  SERVICE_LIFE_YEARS,
  type AgeBand,
  type DetectorFlag,
} from "@/config/domain";
import { DataText } from "@/components/core/data-text";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChoiceGroup, FormSection, InfoNote } from "@/components/inspection/form-controls";
import {
  isExpired,
  type InspectionAction,
  type InspectionFormState,
  type ReplacementItem,
} from "@/lib/inspection";

const FIELD_CLASS =
  "h-11 w-full rounded-sm border border-hairline-strong bg-surface px-3 text-body-md text-ink placeholder:text-subtle";

/** 중제목 — 단계 제목(28px)보다 한 단계 아래 */
function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-title text-ink">{children}</h3>;
}

/** 교체 항목 번호 배지 — 폰트 의존 없는 CSS 원형 */
function NumberBadge({ n }: { n: number }) {
  return (
    <span
      aria-hidden
      className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand text-caption text-on-accent"
    >
      {n}
    </span>
  );
}

/** 교체 대상 1건 — 사유 + 사유별 후속 입력 */
function ReplacementCard({
  index,
  item,
  dispatch,
}: {
  index: number;
  item: ReplacementItem;
  dispatch: React.Dispatch<InspectionAction>;
}) {
  const n = index + 1;
  return (
    <fieldset className="space-y-3 rounded-sm bg-surface-muted p-3">
      <legend className="sr-only">{n}번째 교체 대상</legend>
      <div className="flex items-center gap-2">
        <NumberBadge n={n} />
        <span className="text-body-md text-ink">
          <DataText>{n}</DataText>번째 교체 사유 (필수)
        </span>
      </div>

      <ChoiceGroup
        options={REPLACE_REASON}
        value={item.reason}
        onChange={(v) => dispatch({ type: "SET_REPLACEMENT_REASON", index, value: v })}
        columns={3}
        ariaPrefix={`${n}번째 교체 사유`}
      />

      {item.reason === "battery-dead" && (
        <fieldset>
          <legend className="mb-2 text-body-sm text-body">
            전지 유형 (필수) — 일체형은 기기 교체(RX-IOT)로 분기
          </legend>
          <ChoiceGroup
            options={BATTERY_TYPE}
            value={item.batteryType}
            onChange={(v) => dispatch({ type: "SET_REPLACEMENT_BATTERY", index, value: v })}
            columns={3}
            ariaPrefix={`${n}번째 전지 유형`}
          />
        </fieldset>
      )}

      {item.reason === "appearance" && (
        <fieldset className="rounded-sm bg-surface p-3">
          <legend className="mb-1 text-body-sm text-body">외관 상태 (필수, 다중선택)</legend>
          {(Object.keys(DETECTOR_FLAG) as DetectorFlag[]).map((f) => (
            <label key={f} className="flex min-h-11 items-center gap-2 text-body-md text-ink">
              <input
                type="checkbox"
                checked={item.flags.includes(f)}
                onChange={() => dispatch({ type: "TOGGLE_REPLACEMENT_FLAG", index, value: f })}
                className="size-5 accent-brand"
              />
              {DETECTOR_FLAG[f].label}
            </label>
          ))}
        </fieldset>
      )}
    </fieldset>
  );
}

/**
 * 경보기 확인 — 세대 단위 집계.
 * 제조년월이 내용연수 판정을 좌우하므로 항상 최상단. 경과면 전량 교체로 자동 확정하고,
 * 미경과면 교체 개수를 받아 그 개수만큼 사유를 항목별로 받는다.
 */
export function AlarmSection({
  form,
  dispatch,
}: {
  form: InspectionFormState;
  dispatch: React.Dispatch<InspectionAction>;
}) {
  const expired = isExpired(form);

  return (
    <FormSection className="space-y-6">
      {/* ── 제조년월 확인 ── */}
      <SubHeading>제조년월 확인</SubHeading>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-2 block text-body-md text-ink" htmlFor="alarm-mfg">
            제조년월 (라벨 확인 우선)
          </label>
          <input
            id="alarm-mfg"
            type="month"
            value={form.mfgYm ?? ""}
            onChange={(e) =>
              dispatch({ type: "SET_MFG_YM", value: e.target.value === "" ? null : e.target.value })
            }
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <label className="mb-2 block text-body-md text-ink" htmlFor="alarm-age">
            연차 구간 (판독 불가 시)
          </label>
          <Select
            value={form.ageBand ?? undefined}
            disabled={form.mfgYm !== null}
            onValueChange={(v) => dispatch({ type: "SET_AGE_BAND", value: v as AgeBand })}
          >
            <SelectTrigger id="alarm-age" className="h-11 w-full border-hairline-strong">
              <SelectValue placeholder="구간 선택" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(AGE_BAND) as AgeBand[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {AGE_BAND[k].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── 교체 필요 개수 확인 ── */}
      <SubHeading>교체 필요 개수 확인</SubHeading>
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
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <label className="mb-2 block text-body-md text-ink" htmlFor="replace-count">
            교체 필요 개수 (필수)
          </label>
          {/* 내용연수 경과 시엔 전량 교체가 확정이라 입력을 막고 실 개수를 그대로 보여준다 */}
          <input
            id="replace-count"
            type="number"
            min={0}
            max={form.roomCount ?? 9}
            inputMode="numeric"
            disabled={expired}
            value={expired ? (form.roomCount ?? "") : (form.replaceCount ?? "")}
            onChange={(e) =>
              dispatch({
                type: "SET_REPLACE_COUNT",
                value: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            placeholder="이상 없으면 0"
            className={`${FIELD_CLASS} disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-subtle`}
          />
        </div>
      </div>

      {expired ? (
        <InfoNote tone="caution">
          내용연수(<DataText>{SERVICE_LIFE_YEARS.detector}</DataText>년) 경과 —{" "}
          <DataText>{form.roomCount ?? 0}</DataText>개 전량 교체 대상으로 자동 기록됩니다. 개수·사유
          입력 없이 다음 단계로 진행하세요.
        </InfoNote>
      ) : (
        <>
          <InfoNote>
            실별 1개가 원칙입니다. 각 실의 경보기 점검 버튼을 눌러 작동을 확인한 뒤, 교체가 필요한
            개수만 적어주세요.
          </InfoNote>

          {form.replacements.map((item, i) => (
            <ReplacementCard key={i} index={i} item={item} dispatch={dispatch} />
          ))}

          {form.replacements.some((item) => item.reason === "appearance") && (
            <p className="text-caption text-subtle">※ 배선형 자탐설비 기준 준용</p>
          )}
        </>
      )}
    </FormSection>
  );
}
