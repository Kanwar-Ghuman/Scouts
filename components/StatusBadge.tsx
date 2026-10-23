"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { DataSource } from "@/types";

const INFO: Record<DataSource, { label: string; dot: string; tip: string }> = {
  live: { label: "Live data", dot: "bg-emerald-600", tip: "Features come straight from Snowflake (Overture Maps Places)." },
  offline: { label: "Offline data", dot: "bg-amber-500", tip: "Snowflake is unreachable. Showing the last export of the same data." },
  mock: { label: "Demo data", dot: "bg-zinc-400", tip: "Mock mode is on. No Snowflake or Postgres calls are made." },
};

export function StatusBadge({ source }: { source: DataSource | null }) {
  if (!source) return null;
  const info = INFO[source];
  return (
    <Tooltip>
      <TooltipTrigger
        className="pointer-events-auto absolute right-4 bottom-8 hidden items-center gap-1.5 rounded-full border border-zinc-200 bg-white/95 px-2.5 py-1 text-xs font-medium text-zinc-700 shadow-sm backdrop-blur-sm md:inline-flex"
      >
        <span className={cn("size-2 rounded-full", info.dot)} />
        {info.label}
      </TooltipTrigger>
      <TooltipContent side="left">{info.tip}</TooltipContent>
    </Tooltip>
  );
}
