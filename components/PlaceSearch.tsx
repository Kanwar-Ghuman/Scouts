"use client";

import { useEffect, useRef, useState } from "react";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchJson, isAbort } from "@/hooks/fetchJson";
import { prettyCategory } from "@/lib/format";
import type { PlaceResult, SearchResponse } from "@/types";

export function PlaceSearch({ onPick }: { onPick: (place: PlaceResult) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searchedFor, setSearchedFor] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const term = q.trim();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      fetchJson<SearchResponse>(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => {
          setResults(r.results);
          setSearchedFor(term);
        })
        .catch((err) => {
          if (isAbort(err)) return;
          setResults([]);
          setSearchedFor(term);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [term]);

  const pending = term.length >= 2 && searchedFor !== term;
  const showList = open && term.length >= 2;

  return (
    <div className="pointer-events-auto relative w-full md:absolute md:top-4 md:left-1/2 md:w-[360px] md:-translate-x-1/2">
      <Command
        shouldFilter={false}
        className="h-auto rounded-2xl! border border-zinc-200 bg-white/95 shadow-lg backdrop-blur-sm"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            inputRef.current?.blur();
            e.stopPropagation();
          }
        }}
      >
        <CommandInput
          ref={inputRef}
          value={q}
          onValueChange={(v) => {
            setQ(v);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search a place, like Cal Poly or Target"
          aria-label="Search a place"
        />
        {showList && (
          <CommandList className="mt-1 border-t border-zinc-100">
            {pending ? (
              <div className="flex flex-col gap-2 p-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <>
                <CommandEmpty className="py-4 text-sm text-zinc-500">No places found.</CommandEmpty>
                {results.map((p, i) => (
                  <CommandItem
                    key={`${p.name}-${p.h3}-${i}`}
                    value={`${p.name}-${p.h3}-${i}`}
                    onSelect={() => {
                      onPick(p);
                      setQ(p.name);
                      setOpen(false);
                      inputRef.current?.blur();
                    }}
                    className="flex flex-col items-start gap-0 py-2 [&>svg]:hidden"
                  >
                    <span className="w-full truncate font-medium text-zinc-900">{p.name}</span>
                    <span className="text-[11px] text-zinc-500">{prettyCategory(p.category)}</span>
                  </CommandItem>
                ))}
              </>
            )}
          </CommandList>
        )}
      </Command>
    </div>
  );
}
