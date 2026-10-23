"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/panel/BrandMark";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-dvh items-center justify-center bg-zinc-100 p-6">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg">
        <BrandMark className="mb-3 size-8" />
        <h1 className="text-lg font-semibold text-zinc-900">Something went wrong</h1>
        <p className="mt-1 text-sm text-zinc-500">The map hit an unexpected error. Your settings are saved in the URL.</p>
        <div className="mt-5 flex gap-2">
          <Button onClick={reset} className="bg-emerald-700 text-white hover:bg-emerald-800">Try again</Button>
          <Button variant="outline" onClick={() => window.location.reload()}>Reload</Button>
        </div>
      </div>
    </div>
  );
}
