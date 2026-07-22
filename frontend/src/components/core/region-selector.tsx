import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DONG, SIDO, SIGUNGU, type RegionOption } from "@/mock/sample";
import { cn } from "@/lib/utils";

type Density = "control" | "field";

const TRIGGER_CLASS: Record<Density, string> = {
  control:
    "min-w-40 rounded-sm border-hairline-strong bg-surface data-[size=default]:h-10",
  field:
    "min-w-44 rounded-sm border-hairline-strong bg-surface text-body-md data-[size=default]:h-11",
};

export interface RegionValue {
  sido?: string;
  sigungu?: string;
  dong?: string;
}

export interface RegionSelectorProps {
  value: RegionValue;
  onChange: (next: RegionValue) => void;
  density?: Density;
  className?: string;
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
  options: RegionOption[];
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
  className,
}: RegionSelectorProps) {
  const triggerClass = TRIGGER_CLASS[density];
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <LevelSelect
        ariaLabel="시·도 선택"
        placeholder="시·도"
        options={SIDO}
        value={value.sido}
        onChange={(sido) => onChange({ sido })}
        triggerClass={triggerClass}
      />
      <LevelSelect
        ariaLabel="시·군·구 선택"
        placeholder="시·군·구"
        options={value.sido ? (SIGUNGU[value.sido] ?? []) : []}
        value={value.sigungu}
        disabled={!value.sido}
        onChange={(sigungu) => onChange({ sido: value.sido, sigungu })}
        triggerClass={triggerClass}
      />
      <LevelSelect
        ariaLabel="읍·면·동 선택"
        placeholder="읍·면·동"
        options={value.sigungu ? (DONG[value.sigungu] ?? []) : []}
        value={value.dong}
        disabled={!value.sigungu}
        onChange={(dong) => onChange({ ...value, dong })}
        triggerClass={triggerClass}
      />
    </div>
  );
}
