import { BUSINESS_TYPE_KEYS, BUSINESS_TYPES, type BusinessTypeKey } from "@/lib/businessTypes";
import { cn } from "@/lib/utils";

interface Props {
  value: BusinessTypeKey;
  onChange: (type: BusinessTypeKey) => void;
}

export function TypeSelect({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Business type">
      {BUSINESS_TYPE_KEYS.map((key) => {
        const { short, label, icon: Icon } = BUSINESS_TYPES[key];
        const active = key === value;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            title={label}
            onClick={() => onChange(key)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/50",
              active ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {short}
          </button>
        );
      })}
    </div>
  );
}
