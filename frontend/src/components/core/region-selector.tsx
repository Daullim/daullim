import { useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDongs, getSidos, getSigungus } from "@/api/queries";
import { useApiQuery } from "@/api/use-api-query";
import { cn } from "@/lib/utils";

type Density = "control" | "field";

const TRIGGER_CLASS: Record<Density, string> = {
  control:
    "min-w-40 rounded-sm border-hairline-strong bg-surface data-[size=default]:h-10",
  field:
    "min-w-44 rounded-sm border-hairline-strong bg-surface text-body-md data-[size=default]:h-11",
};

const ALL_SIGUNGU = "__all_sigungu__";

/**
 * 값은 **행정표준코드**다 — 시도 2자리(`11`) · 시군구 5자리(`11620`) · 행정동 10자리(`1162069500`).
 * 접두사 관계가 성립해(`dong[:5] === sigungu`) 서버도 별도 매핑 없이 계층을 푼다.
 */
export interface RegionValue {
  sido?: string;
  sigungu?: string;
  dong?: string;
}

export interface RegionSelectorProps {
  value: RegionValue;
  onChange: (next: RegionValue) => void;
  density?: Density;
  /**
   * 목록이 도착하면 비어 있는 단계를 첫 항목으로 채워 내려간다 — 화면 진입 즉시 데이터가 뜨도록.
   * `"none"`이면 사용자가 전부 고른다.
   */
  autoSelect?: "none" | "sigungu" | "dong";
  /** 노출할 마지막 단계. 관제는 시군구까지만 — 동은 표·지도에서 고른다. */
  levels?: "sigungu" | "dong";
  className?: string;
}

interface Option {
  value: string;
  label: string;
}

function LevelSelect({
  ariaLabel,
  placeholder,
  options,
  value,
  disabled,
  onChange,
  triggerClass,
}: {
  ariaLabel: string;
  placeholder: string;
  options: Option[];
  value?: string;
  disabled?: boolean;
  onChange: (v: string) => void;
  triggerClass: string;
}) {
  return (
    <Select value={value ?? ""} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger aria-label={ariaLabel} className={triggerClass}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** 시·도 → 시·군·구 → 읍·면·동 3연쇄 — 상위 변경 시 하위 리셋 */
export function RegionSelector({
  value,
  onChange,
  density = "control",
  autoSelect = "sigungu",
  levels = "dong",
  className,
}: RegionSelectorProps) {
  const triggerClass = TRIGGER_CLASS[density];
  const showDong = levels === "dong";
  const showSigunguAll = levels === "sigungu";

  const sidos = useApiQuery("sidos", (s) => getSidos(s));
  /* 상위가 비면 조회하지 않는다 — key가 null이면 훅이 호출을 건너뛴다 */
  const sigungus = useApiQuery(value.sido ? `sigungus:${value.sido}` : null, (s) =>
    getSigungus(value.sido!, s),
  );
  /* 동 단계를 감추면 목록도 부르지 않는다 — 관제에서 21행짜리 왕복이 그대로 남는다 */
  const dongs = useApiQuery(showDong && value.sigungu ? `dongs:${value.sigungu}` : null, (s) =>
    getDongs(value.sigungu!, s),
  );

  /* 목록 도착 순서대로 한 단계씩 채운다 — 각 효과는 자기 단계가 빌 때만 움직인다 */
  useEffect(() => {
    if (autoSelect === "none" || value.sido || !sidos.data?.length) return;
    onChange({ sido: sidos.data[0].sidoCd });
  }, [autoSelect, value.sido, sidos.data, onChange]);

  useEffect(() => {
    if (autoSelect === "none" || !value.sido || value.sigungu || !sigungus.data?.length) return;
    onChange({ sido: value.sido, sigungu: sigungus.data[0].sigunguCd });
  }, [autoSelect, value.sido, value.sigungu, sigungus.data, onChange]);

  useEffect(() => {
    if (autoSelect !== "dong" || !value.sigungu || value.dong || !dongs.data?.length) return;
    onChange({ ...value, dong: dongs.data[0].dongCd });
  }, [autoSelect, value, dongs.data, onChange]);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <LevelSelect
        ariaLabel="시·도 선택"
        placeholder="시·도"
        options={(sidos.data ?? []).map((r) => ({ value: r.sidoCd, label: r.sidoNm }))}
        value={value.sido}
        onChange={(sido) => onChange({ sido })}
        triggerClass={triggerClass}
      />
      <LevelSelect
        ariaLabel="시·군·구 선택"
        placeholder="시·군·구"
        options={[
          ...(showSigunguAll ? [{ value: ALL_SIGUNGU, label: "전체지역" }] : []),
          ...(sigungus.data ?? []).map((r) => ({
            value: r.sigunguCd,
            label: r.sigunguNm,
          })),
        ]}
        value={showSigunguAll && !value.sigungu ? ALL_SIGUNGU : value.sigungu}
        disabled={!value.sido}
        onChange={(sigungu) =>
          onChange(
            sigungu === ALL_SIGUNGU ? { sido: value.sido } : { sido: value.sido, sigungu },
          )
        }
        triggerClass={triggerClass}
      />
      {showDong && (
        <LevelSelect
          ariaLabel="읍·면·동 선택"
          placeholder="읍·면·동"
          options={(dongs.data ?? []).map((r) => ({ value: r.dongCd, label: r.dongNm }))}
          value={value.dong}
          disabled={!value.sigungu}
          onChange={(dong) => onChange({ ...value, dong })}
          triggerClass={triggerClass}
        />
      )}
    </div>
  );
}
