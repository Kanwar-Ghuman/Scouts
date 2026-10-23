import { SectionLabel } from "@/components/panel/SectionLabel";
import { GROUP_COLORS } from "@/lib/colors";
import { contributions, explainScore } from "@/lib/model";
import type { ModelWeights, ScoredHex } from "@/types";

interface Props {
  hex: ScoredHex;
  weights: ModelWeights;
  total: number;
}

export function ScoreBreakdown({ hex, weights, total }: Props) {
  const parts = contributions(hex, weights);
  const sum = parts.reduce((s, p) => s + p.value, 0);
  return (
    <section className="flex flex-col gap-2">
      <SectionLabel>Why this score</SectionLabel>
      <div className="flex flex-col gap-1 rounded-lg bg-zinc-50 p-3 font-mono text-xs leading-relaxed text-zinc-700">
        {explainScore(hex, weights, total).map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-zinc-100" aria-label="Demand by group">
        {sum > 0 &&
          parts.filter((p) => p.value > 0).map((p) => (
            <div
              key={p.key}
              className="h-full transition-[width] duration-300"
              style={{ width: `${(100 * p.value) / sum}%`, background: GROUP_COLORS[p.key] }}
              title={`${p.label}: ${p.value}`}
            />
          ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {parts.map((p) => (
          <span key={p.key} className="inline-flex items-center gap-1 text-[11px] text-zinc-500 tabular-nums">
            <span className="size-2 rounded-sm" style={{ background: GROUP_COLORS[p.key] }} />
            {p.label} {sum > 0 ? Math.round((100 * p.value) / sum) : 0}%
          </span>
        ))}
      </div>
    </section>
  );
}
