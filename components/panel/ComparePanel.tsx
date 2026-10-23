"use client";

import { ArrowLeftRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LlmText } from "@/components/panel/LlmText";
import { SectionLabel } from "@/components/panel/SectionLabel";
import { useCompare } from "@/hooks/useCompare";
import type { BusinessTypeKey } from "@/lib/businessTypes";
import { pickWinner } from "@/lib/model";
import { cn } from "@/lib/utils";
import type { ModelWeights, ScoredHex } from "@/types";

interface Props {
  a: ScoredHex;
  b: ScoredHex;
  type: BusinessTypeKey;
  weights: ModelWeights;
  onSwap: () => void;
  onClose: () => void;
}

const LETTER_CLASS = { A: "text-indigo-600", B: "text-amber-500" } as const;

const ROWS: { label: string; get: (h: ScoredHex) => number; lowerIsBetter?: boolean; fmt?: (n: number) => string }[] = [
  { label: "Score", get: (h) => h.score },
  { label: "Rank", get: (h) => h.rank, lowerIsBetter: true, fmt: (n) => `#${n}` },
  { label: "Students", get: (h) => h.students },
  { label: "Workers", get: (h) => h.workers },
  { label: "Residents", get: (h) => h.residents },
  { label: "Shoppers", get: (h) => h.shoppers },
  { label: "Competitors", get: (h) => h.competitors, lowerIsBetter: true },
  { label: "Demand", get: (h) => h.demand, fmt: (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1)) },
];

export function ComparePanel({ a, b, type, weights, onSwap, onClose }: Props) {
  const winner = pickWinner(a, b);
  const winnerLabel = winner.h3 === a.h3 ? "A" : "B";
  const loser = winner === a ? b : a;
  const { data, loading, error, retry } = useCompare(a.h3, b.h3, type, weights);
  // The explanation must match the model's current pick; hide a stale one while the refetch is pending.
  const text = data && data.winner === winner.h3 ? data.explanation : null;

  return (
    <div className="flex flex-col gap-5 p-5">
      <header className="flex items-center gap-2">
        <h2 className="text-xl font-semibold text-zinc-900">
          <span className={LETTER_CLASS.A}>A</span> vs <span className={LETTER_CLASS.B}>B</span>
        </h2>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="sm" onClick={onSwap}>
            <ArrowLeftRight />
            Swap
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
            <X />
          </Button>
        </div>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <SectionLabel>Model decision</SectionLabel>
        <p className="mt-1 text-lg font-semibold text-zinc-900">
          Model picks Spot <span className={LETTER_CLASS[winnerLabel]}>{winnerLabel}</span>
        </p>
        <p className="text-sm text-zinc-500 tabular-nums">
          Score {winner.score} vs {loser.score} under your priorities.
        </p>
      </section>

      <LlmText label="Why" text={text} loading={loading || (!!data && !text)} error={error} onRetry={retry} />

      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="border-b border-zinc-200 text-xs text-zinc-500">
            <th className="py-2 text-left font-medium" />
            <th className={cn("py-2 text-right font-semibold", LETTER_CLASS.A)}>A</th>
            <th className={cn("py-2 text-right font-semibold", LETTER_CLASS.B)}>B</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => {
            const va = row.get(a);
            const vb = row.get(b);
            const aBetter = row.lowerIsBetter ? va < vb : va > vb;
            const bBetter = row.lowerIsBetter ? vb < va : vb > va;
            const fmt = row.fmt ?? String;
            return (
              <tr key={row.label} className="border-b border-zinc-100 last:border-0">
                <td className="py-2.5 text-zinc-600">{row.label}</td>
                <td className={cn("py-2.5 text-right text-zinc-700", aBetter && "font-semibold text-zinc-900")}>{fmt(va)}</td>
                <td className={cn("py-2.5 text-right text-zinc-700", bBetter && "font-semibold text-zinc-900")}>{fmt(vb)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="text-xs text-zinc-500">Change priorities on the left and the decision updates.</p>
    </div>
  );
}
