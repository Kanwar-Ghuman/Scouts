"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { SectionLabel } from "@/components/panel/SectionLabel";
import type { PlanResponse } from "@/types";

const EXAMPLES = [
  "Boba shop near college students, avoid competition",
  "Laundromat for apartment renters",
  "Gym for office workers and residents",
];

interface Props {
  loading: boolean;
  error: string | null;
  plan: PlanResponse | null;
  onSubmit: (text: string) => void;
}

export function IntentBox({ loading, error, plan, onSubmit }: Props) {
  const [text, setText] = useState("");

  const submit = (value: string) => {
    const t = value.trim();
    if (t.length < 3 || loading) return;
    onSubmit(t);
  };

  return (
    <section className="flex flex-col gap-2.5">
      <SectionLabel>Describe your business</SectionLabel>
      <Textarea
        rows={2}
        value={text}
        maxLength={400}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit(text);
          }
        }}
        placeholder="Boba shop near students. I really want to avoid competition."
        className="min-h-14 resize-none bg-white focus-visible:border-emerald-700 focus-visible:ring-emerald-700/20"
        aria-label="Describe your business"
      />
      <Button
        onClick={() => submit(text)}
        disabled={loading || text.trim().length < 3}
        className="h-9 w-full bg-emerald-700 text-white hover:bg-emerald-800"
      >
        {loading ? "Thinking…" : "Find my spot"}
      </Button>
      <div className="flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            disabled={loading}
            onClick={() => {
              setText(ex);
              submit(ex);
            }}
            className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-left text-[11px] text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-50"
          >
            {ex}
          </button>
        ))}
      </div>
      {loading && <Skeleton className="h-14 w-full rounded-lg" />}
      {!loading && error && <p className="text-sm text-zinc-600">Couldn&apos;t read that. Try one of the examples.</p>}
      {!loading && !error && plan && (
        <div className="animate-in fade-in rounded-lg border border-zinc-200 border-l-4 border-l-emerald-700 bg-white p-3 duration-200">
          <p className="text-sm text-zinc-900">{plan.summary}</p>
          <p className="mt-1 text-[11px] text-zinc-500">
            {plan.fromLLM
              ? "Llama set these priorities. The model picks the spots."
              : "Matched by keyword. Adjust the sliders below."}
          </p>
        </div>
      )}
    </section>
  );
}
