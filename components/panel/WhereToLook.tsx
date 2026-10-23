import { Building2, ExternalLink, MapPin, Users } from "lucide-react";
import { SectionLabel } from "@/components/panel/SectionLabel";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { brokersUrl, loopnetUrl, nearestCity, pinUrl, type LookSpot } from "@/lib/whereToLook";

const joinWords = (words: string[]) =>
  words.length <= 1 ? words.join("") : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;

export function WhereToLook({ spot }: { spot: LookSpot }) {
  const coords = `${spot.lat.toFixed(5)}, ${spot.lng.toFixed(5)}`;
  const city = nearestCity(spot.lat, spot.lng);
  return (
    <section className="flex flex-col gap-2">
      <SectionLabel>Where to look</SectionLabel>
      <div className="flex items-start gap-2.5 rounded-lg bg-emerald-50 p-3">
        <MapPin className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden />
        <div className="min-w-0 text-sm text-zinc-700">
          <p>
            {spot.fromDemand
              ? <>Start at the pin: the center of the <b>{joinWords(spot.groups.slice(0, 2))}</b> that drive this score, weighted by your priorities.</>
              : <>Start at the pin in the middle of this area.</>}
          </p>
          <a
            href={pinUrl(spot.lat, spot.lng)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 font-mono text-xs text-emerald-800 tabular-nums hover:underline"
          >
            {coords}
            <ExternalLink className="size-3" aria-hidden />
          </a>
        </div>
      </div>
      <a
        href={loopnetUrl(city.slug)}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(buttonVariants({ variant: "outline" }), "h-9")}
      >
        <Building2 />
        Retail spaces for lease in {city.name} (LoopNet)
      </a>
      <a
        href={brokersUrl(spot.lat, spot.lng)}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(buttonVariants({ variant: "outline" }), "h-9")}
      >
        <Users />
        Commercial brokers near the pin
      </a>
      <p className="text-[11px] text-zinc-500">
        Site Scout doesn&apos;t have lease data. LoopNet lists spaces across the whole city; brokers near the pin know
        what&apos;s open nearby and what it costs.
      </p>
    </section>
  );
}
