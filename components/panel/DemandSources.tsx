import { SectionLabel } from "@/components/panel/SectionLabel";
import { prettyCategory } from "@/lib/format";
import type { DriverCount } from "@/types";

export function DemandSources({ rows }: { rows: DriverCount[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <section className="flex flex-col gap-1">
      <SectionLabel>Demand sources</SectionLabel>
      {rows.length === 0 && <p className="py-2 text-sm text-zinc-500">No demand sources in this area.</p>}
      {rows.map((r) => (
        <div key={`${r.category}-${r.group}`} className="py-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-sm text-zinc-900">
              {prettyCategory(r.category)} <span className="text-[11px] text-zinc-500">{r.group}</span>
            </span>
            <span className="text-sm text-zinc-700 tabular-nums">{r.count}</span>
          </div>
          <div className="mt-1 h-1 rounded-full bg-zinc-100">
            <div className="h-full rounded-full bg-emerald-700" style={{ width: `${(100 * r.count) / max}%` }} />
          </div>
        </div>
      ))}
    </section>
  );
}
