"use client";

import { GitCompareArrows } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoreBadge } from "@/components/panel/ScoreBadge";
import { SectionLabel } from "@/components/panel/SectionLabel";
import { plural } from "@/lib/format";
import { contributions, scoreLabel } from "@/lib/model";
import { cn } from "@/lib/utils";
import type { ModelWeights, ScoredHex } from "@/types";

interface Props {
  spots: ScoredHex[];
  weights: ModelWeights;
  selectedH3: string | null;
  loading: boolean;
  onSelect: (hex: ScoredHex) => void;
  onCompare: (hex: ScoredHex) => void;
}

function subline(h: ScoredHex, w: ModelWeights): string {
  const top = contributions(h, w)[0];
  const lead = top && top.value > 0 ? `Mostly ${top.label.toLowerCase()}` : "Little demand";
  return `${lead} · ${plural(h.competitors, "competitor")}`;
}

export function TopSpots({ spots, weights, selectedH3, loading, onSelect, onCompare }: Props) {
  return (
    <section className="flex flex-col gap-1.5">
      <SectionLabel>Top spots</SectionLabel>
      {loading
        ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)
        : spots.map((h) => (
            <div
              key={h.h3}
              className={cn(
                "group animate-in fade-in flex items-center gap-1 rounded-lg duration-200 hover:bg-zinc-50",
                selectedH3 === h.h3 && "bg-zinc-100 hover:bg-zinc-100"
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(h)}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/50"
              >
                <span className="w-4 text-sm font-medium text-zinc-400 tabular-nums">{h.rank}</span>
                <ScoreBadge score={h.score} />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-zinc-900">{scoreLabel(h.score)} spot</span>
                  <span className="block truncate text-[11px] text-zinc-500">{subline(h, weights)}</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => onCompare(h)}
                aria-label="Compare this spot"
                title="Compare"
                className="mr-1 rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-700"
              >
                <GitCompareArrows className="size-4" />
              </button>
            </div>
          ))}
    </section>
  );
}
