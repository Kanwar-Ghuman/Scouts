"use client";

import { useState } from "react";
import { ChevronDown, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AccountMenu } from "@/components/panel/AccountMenu";
import { Wordmark } from "@/components/panel/Wordmark";
import { IntentBox } from "@/components/panel/IntentBox";
import { ModelInfo } from "@/components/panel/ModelInfo";
import { PriorityControls } from "@/components/panel/PriorityControls";
import { TopSpots } from "@/components/panel/TopSpots";
import { TypeSelect } from "@/components/panel/TypeSelect";
import type { BusinessTypeKey } from "@/lib/businessTypes";
import { cn } from "@/lib/utils";
import type { Account, Business, ModelWeights, PlanResponse, ScoredHex } from "@/types";

interface Props {
  account: Account;
  business: Business;
  weights: ModelWeights;
  scored: ScoredHex[];
  selectedH3: string | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  plan: { data: PlanResponse | null; loading: boolean; error: string | null };
  onPlan: (text: string) => void;
  onTypeChange: (t: BusinessTypeKey) => void;
  onWeightsChange: (w: ModelWeights) => void;
  onResetWeights: () => void;
  onSelectSpot: (h: ScoredHex) => void;
  onCompareSpot: (h: ScoredHex) => void;
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied");
  } catch {
    toast.error("Couldn't copy the link");
  }
}

export function ControlPanel(props: Props) {
  const { business, weights, scored, loading, error } = props;
  const [open, setOpen] = useState(false);
  const strong = scored.filter((h) => h.score >= 70).length;

  return (
    <aside className="pointer-events-auto flex max-h-[70dvh] w-full flex-col overflow-y-auto rounded-2xl border border-zinc-200 bg-white/95 shadow-lg backdrop-blur-sm md:absolute md:top-4 md:bottom-4 md:left-4 md:max-h-none md:w-[360px]">
      <div className="flex flex-col gap-4 p-5">
        <header>
          <div className="flex items-center gap-2">
            <h1>
              <Wordmark className="h-5 w-auto" />
            </h1>
            <span className="ml-auto rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
              Pomona, CA
            </span>
            <AccountMenu account={props.account} />
          </div>
          <p className="mt-1 text-sm text-zinc-500">A decision model for where to open your business.</p>
        </header>

        <IntentBox loading={props.plan.loading} error={props.plan.error} plan={props.plan.data} onSubmit={props.onPlan} />

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center justify-between rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-700 md:hidden"
          aria-expanded={open}
        >
          Priorities and top spots
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        </button>

        <div className={cn("flex-col gap-4", open ? "flex" : "hidden md:flex")}>
          <TypeSelect value={business} onChange={props.onTypeChange} />
          <Separator />
          <PriorityControls business={business} weights={weights} onChange={props.onWeightsChange} onReset={props.onResetWeights} />
          <Separator />
          {error ? (
            <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-sm text-zinc-700">Couldn&apos;t load map data.</p>
              <Button size="sm" variant="outline" onClick={props.onRetry}>Retry</Button>
            </div>
          ) : (
            <p className="text-sm text-zinc-600 tabular-nums">
              {loading ? "Scoring areas around Pomona…" : `${scored.length} areas scored · ${strong} strong spots`}
            </p>
          )}
          {!error && (
            <TopSpots
              spots={scored.slice(0, 3)}
              weights={weights}
              selectedH3={props.selectedH3}
              loading={loading}
              onSelect={props.onSelectSpot}
              onCompare={props.onCompareSpot}
            />
          )}
          <Separator />
          <footer className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <ModelInfo />
              <button
                type="button"
                onClick={copyLink}
                className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900"
              >
                <Link2 className="size-3.5" aria-hidden />
                Share
              </button>
            </div>
            <p className="text-[11px] text-zinc-500">Data: Overture Maps · LLM: Llama 3.3 70B</p>
          </footer>
        </div>
      </div>
    </aside>
  );
}
