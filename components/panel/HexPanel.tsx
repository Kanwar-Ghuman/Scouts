"use client";

import { ExternalLink, FileText, GitCompareArrows, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CompetitorList } from "@/components/panel/CompetitorList";
import { DemandSources } from "@/components/panel/DemandSources";
import { ScoreBadge } from "@/components/panel/ScoreBadge";
import { ScoreBreakdown } from "@/components/panel/ScoreBreakdown";
import { VerdictCard } from "@/components/panel/VerdictCard";
import { businessLabel } from "@/lib/business";
import { scoreLabel } from "@/lib/model";
import { reportUrl } from "@/lib/urlState";
import type { Business, HexDetailResponse, ModelWeights, ScoredHex } from "@/types";

interface Props {
  /** The owner's business name, shown instead of the generic label when set. */
  ownerName?: string | null;
  hex: ScoredHex | null;
  total: number;
  business: Business;
  weights: ModelWeights;
  detail: HexDetailResponse | null;
  detailLoading: boolean;
  detailError: string | null;
  onRetry: () => void;
  onClose: () => void;
  onCompare: () => void;
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close" className="shrink-0">
      <X />
    </Button>
  );
}

export function HexPanel({ hex, total, business, ownerName, weights, detail, detailLoading, detailError, onRetry, onClose, onCompare }: Props) {
  if (!hex) {
    return (
      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between">
          <p className="text-sm text-zinc-700">No data for this area.</p>
          <CloseButton onClose={onClose} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      <header className="flex items-start gap-4">
        <ScoreBadge score={hex.score} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold text-zinc-900">{scoreLabel(hex.score)} spot</h2>
          <p className="text-sm text-zinc-500 tabular-nums">
            Rank #{hex.rank} of {total} for {ownerName ?? `a ${businessLabel(business).toLowerCase()}`}
          </p>
        </div>
        <CloseButton onClose={onClose} />
      </header>

      <VerdictCard h3={hex.h3} business={business} weights={weights} />
      <ScoreBreakdown hex={hex} weights={weights} total={total} />
      <Separator />

      {detailLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      )}
      {!detailLoading && detailError === "not_found" && <p className="text-sm text-zinc-600">No data for this area.</p>}
      {!detailLoading && detailError && detailError !== "not_found" && (
        <div className="flex items-center justify-between text-sm text-zinc-600">
          <span>Couldn&apos;t load area details.</span>
          <Button size="sm" variant="outline" onClick={onRetry}>Retry</Button>
        </div>
      )}
      {detail && (
        <>
          <DemandSources rows={detail.driverBreakdown} />
          <CompetitorList rows={detail.nearestCompetitors} />
        </>
      )}

      <Separator />
      <div className="flex flex-col gap-2">
        <Button onClick={onCompare} className="h-9 bg-emerald-700 text-white hover:bg-emerald-800">
          <GitCompareArrows />
          Compare with another spot
        </Button>
        <Button
          variant="outline"
          className="h-9"
          onClick={() => window.open(reportUrl(business, weights, hex.h3), "_blank", "noopener")}
        >
          <FileText />
          Download report
        </Button>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${hex.lat},${hex.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1 py-1 text-sm font-medium text-emerald-700 hover:underline"
        >
          Open in Google Maps
          <ExternalLink className="size-3.5" />
        </a>
      </div>
    </div>
  );
}
