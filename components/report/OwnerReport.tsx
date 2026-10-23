"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Wordmark } from "@/components/panel/Wordmark";
import { ScoreBadge } from "@/components/panel/ScoreBadge";
import { useHexDetail } from "@/hooks/useHexDetail";
import { useHexFeatures } from "@/hooks/useHexFeatures";
import { useVerdict } from "@/hooks/useVerdict";
import { BUSINESS_TYPES } from "@/lib/businessTypes";
import { formatDistance, prettyCategory } from "@/lib/format";
import { DRIVER_GROUPS, explainScore, scoreAll, scoreLabel, weightWord } from "@/lib/model";
import { readUrlState, toQuery } from "@/lib/urlState";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid">
      <h2 className="mb-2 text-xs font-medium tracking-wide text-zinc-500 uppercase">{title}</h2>
      {children}
    </section>
  );
}

export function OwnerReport() {
  const params = useSearchParams();
  const { type, weights, hex: h3 } = readUrlState(new URLSearchParams(params.toString()));
  const features = useHexFeatures(type);
  const detail = useHexDetail(h3, type);
  const verdict = useVerdict(h3, type, weights);

  const scored = useMemo(() => scoreAll(features.data ?? [], weights), [features.data, weights]);
  const hex = h3 ? scored.find((h) => h.h3 === h3) : undefined;
  const label = BUSINESS_TYPES[type].label;
  const mapUrl = `/?${toQuery({ type, weights, hex: h3, a: null, b: null })}`;
  const failed = !h3 || features.error || detail.error || (!features.loading && !hex);

  const actions = (
    <div className="mb-8 flex gap-2 print:hidden">
      <Button onClick={() => window.print()} className="bg-emerald-700 text-white hover:bg-emerald-800">
        <Printer />
        Print or save as PDF
      </Button>
      <Link href={mapUrl} className={buttonVariants({ variant: "outline" })}>
        <ArrowLeft />
        Back to map
      </Link>
    </div>
  );

  if (failed) {
    return (
      <main className="mx-auto max-w-[720px] p-10">
        {actions}
        <p className="text-sm text-zinc-700">Couldn&apos;t build this report. Go back and try again.</p>
      </main>
    );
  }

  if (features.loading || detail.loading || !hex) {
    return (
      <main className="mx-auto flex max-w-[720px] flex-col gap-4 p-10">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </main>
    );
  }

  const d = detail.data;
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <main className="mx-auto flex max-w-[720px] flex-col gap-7 bg-white p-10 text-zinc-900 print:p-0">
      {actions}

      <header className="flex items-start justify-between gap-6 border-b border-zinc-200 pb-5">
        <div>
          <h1 className="text-2xl font-semibold">Site Scout location report</h1>
          <p className="mt-1 text-sm text-zinc-500">{label} · Pomona, CA area · {today}</p>
        </div>
        <Wordmark className="mt-1 h-6 w-auto shrink-0" />
      </header>

      <Section title="Score">
        <div className="flex items-center gap-4">
          <ScoreBadge score={hex.score} size="lg" />
          <div>
            <p className="text-xl font-semibold">{scoreLabel(hex.score)} spot</p>
            <p className="text-sm text-zinc-500 tabular-nums">Rank #{hex.rank} of {scored.length} nearby areas</p>
          </div>
        </div>
      </Section>

      <Section title="Owner priorities">
        <div className="grid grid-cols-5 gap-2 text-sm">
          {[...DRIVER_GROUPS.map((g) => ({ label: g.label, v: weights[g.key] })), { label: "Avoid competition", v: weights.competition }].map((p) => (
            <div key={p.label} className="rounded-lg border border-zinc-200 p-2">
              <div className="text-[11px] text-zinc-500">{p.label}</div>
              <div className="font-medium capitalize">{weightWord(p.v)}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Why this score">
        <div className="flex flex-col gap-1 rounded-lg bg-zinc-50 p-3 font-mono text-xs leading-relaxed text-zinc-700">
          {explainScore(hex, weights, scored.length).map((line) => <div key={line}>{line}</div>)}
        </div>
      </Section>

      <Section title="AI summary">
        {verdict.loading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-5/6" />
          </div>
        ) : (
          <p className="text-sm leading-relaxed">{verdict.data?.verdict ?? "No explanation available."}</p>
        )}
        <p className="mt-2 text-[11px] text-zinc-500">Explanation by Llama 3.3 70B. Decision by the Site Scout model.</p>
      </Section>

      <div className="grid grid-cols-2 gap-6">
        <Section title="Demand sources">
          <table className="w-full text-sm tabular-nums">
            <tbody>
              {(d?.driverBreakdown ?? []).map((r) => (
                <tr key={`${r.category}-${r.group}`} className="border-b border-zinc-100">
                  <td className="py-1.5">{prettyCategory(r.category)} <span className="text-[11px] text-zinc-500">{r.group}</span></td>
                  <td className="py-1.5 text-right">{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!d?.driverBreakdown.length && <p className="text-sm text-zinc-500">None in this area.</p>}
        </Section>
        <Section title="Nearest competitors">
          <table className="w-full text-sm tabular-nums">
            <tbody>
              {(d?.nearestCompetitors ?? []).map((c, i) => (
                <tr key={`${c.name}-${i}`} className="border-b border-zinc-100">
                  <td className="max-w-0 truncate py-1.5">{c.name}</td>
                  <td className="py-1.5 text-right whitespace-nowrap text-zinc-500">{formatDistance(c.distanceM)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!d?.nearestCompetitors.length && <p className="text-sm text-zinc-500">No competitors nearby.</p>}
        </Section>
      </div>

      <p className="text-sm print:hidden">
        <a href={mapUrl} className="font-medium text-emerald-700 hover:underline">View on map</a>
      </p>

      <footer className="border-t border-zinc-200 pt-4 text-[11px] leading-relaxed text-zinc-500">
        Data: Overture Maps Foundation places, processed in Snowflake. Basemap © CARTO, © OpenStreetMap contributors.
        Scores compare areas to each other and are not a guarantee of success.
      </footer>
    </main>
  );
}
