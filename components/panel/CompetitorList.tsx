import { SectionLabel } from "@/components/panel/SectionLabel";
import { formatDistance, prettyCategory } from "@/lib/format";
import type { Competitor } from "@/types";

export function CompetitorList({ rows }: { rows: Competitor[] }) {
  return (
    <section className="flex flex-col gap-1">
      <SectionLabel>Nearest competitors</SectionLabel>
      {rows.length === 0 && <p className="py-2 text-sm text-zinc-500">No competitors nearby. That&apos;s a good sign.</p>}
      {rows.map((c, i) => (
        <div key={`${c.name}-${i}`} className="flex items-center gap-2.5 py-1.5">
          <span className="size-2.5 shrink-0 rounded-full bg-rose-600 ring-2 ring-white" />
          <div className="min-w-0">
            <div className="truncate text-sm text-zinc-900">{c.name}</div>
            <div className="text-[11px] text-zinc-500">
              {prettyCategory(c.category)} · {formatDistance(c.distanceM)}
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
