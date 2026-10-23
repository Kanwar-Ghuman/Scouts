import { Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BUSINESS_TYPE_KEYS, BUSINESS_TYPES, type BusinessTypeKey } from "@/lib/businessTypes";
import { cn } from "@/lib/utils";
import type { Business } from "@/types";

interface Props {
  value: Business;
  onChange: (type: BusinessTypeKey) => void;
}

const chip = (active: boolean) =>
  cn(
    "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/50",
    active ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
  );

export function TypeSelect({ value, onChange }: Props) {
  const custom = value.type === "custom" ? value.custom : null;
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Business type">
      {BUSINESS_TYPE_KEYS.map((key) => {
        const { short, label, icon: Icon } = BUSINESS_TYPES[key];
        const active = key === value.type;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            title={label}
            onClick={() => onChange(key)}
            className={chip(active)}
          >
            <Icon className="size-3.5" aria-hidden />
            {short}
          </button>
        );
      })}
      {custom && (
        <span role="radio" aria-checked title={custom.label} className={cn(chip(true), "max-w-full animate-in fade-in duration-200")}>
          <Store className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{custom.label}</span>
          <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">Custom</Badge>
        </span>
      )}
    </div>
  );
}
