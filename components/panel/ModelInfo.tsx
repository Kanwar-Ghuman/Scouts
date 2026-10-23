"use client";

import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function ModelInfo() {
  return (
    <Popover>
      <PopoverTrigger className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline">
        <Info className="size-3.5" aria-hidden />
        How the model works
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-80 p-4 text-sm leading-relaxed text-zinc-700">
        Every hexagon (about 0.7 sq km) gets a demand number: each nearby college, office, apartment or store counts,
        multiplied by how much you said it matters. That demand is divided by the competition penalty. Scores compare
        areas to each other: 90 means better than 90% of nearby areas. The model makes every decision. The AI only
        explains it.
      </PopoverContent>
    </Popover>
  );
}
