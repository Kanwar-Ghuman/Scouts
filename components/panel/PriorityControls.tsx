"use client";

import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { SectionLabel } from "@/components/panel/SectionLabel";
import { BUSINESS_TYPES, type BusinessTypeKey } from "@/lib/businessTypes";
import { DRIVER_GROUPS, WEIGHT_MAX, WEIGHT_MIN, WEIGHT_STEP, isDefault, weightWord } from "@/lib/model";
import type { ModelWeights } from "@/types";

interface Props {
  type: BusinessTypeKey;
  weights: ModelWeights;
  onChange: (w: ModelWeights) => void;
  onReset: () => void;
}

const ROWS: { key: keyof ModelWeights; label: string; hint: string }[] = [
  ...DRIVER_GROUPS,
  { key: "competition", label: "Avoid competition", hint: "Penalty per similar business in the area" },
];

export function PriorityControls({ type, weights, onChange, onReset }: Props) {
  const custom = !isDefault(weights, type);
  return (
    <section className="flex flex-col gap-1">
      <div className="flex h-5 items-center justify-between">
        <SectionLabel>Your priorities</SectionLabel>
        {custom && <Badge variant="secondary">Custom model</Badge>}
      </div>
      {ROWS.map((row) => (
        <div key={row.key} className="grid grid-cols-[1fr_auto] items-center gap-x-3 py-2">
          <div className="min-w-0">
            <div className="text-sm font-medium text-zinc-900">{row.label}</div>
            <div className="truncate text-[11px] text-zinc-500">{row.hint}</div>
          </div>
          <span className="w-14 text-right text-xs text-zinc-500 tabular-nums">{weightWord(weights[row.key])}</span>
          <Slider
            className="col-span-2 mt-2 [&_[data-slot=slider-range]]:bg-emerald-700 [&_[data-slot=slider-thumb]]:border-emerald-700 [&_[data-slot=slider-thumb]]:ring-emerald-700/30"
            min={WEIGHT_MIN}
            max={WEIGHT_MAX}
            step={WEIGHT_STEP}
            value={[weights[row.key]]}
            onValueChange={(v) => {
              const n = Array.isArray(v) ? v[0] : v;
              if (n !== weights[row.key]) onChange({ ...weights, [row.key]: n });
            }}
            aria-label={row.label}
          />
        </div>
      ))}
      {custom && (
        <button
          type="button"
          onClick={onReset}
          className="self-start text-xs font-medium text-emerald-700 hover:underline"
        >
          Reset to {BUSINESS_TYPES[type].short.toLowerCase()} defaults
        </button>
      )}
    </section>
  );
}
