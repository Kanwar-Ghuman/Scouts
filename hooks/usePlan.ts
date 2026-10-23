"use client";

import { useCallback, useRef, useState } from "react";
import type { PlanResponse } from "@/types";
import { isAbort, postJson, toastLlmError } from "@/hooks/fetchJson";

export function usePlan() {
  const [data, setData] = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ctrlRef = useRef<AbortController | null>(null);

  const run = useCallback(async (text: string): Promise<PlanResponse | null> => {
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    setLoading(true);
    setError(null);
    try {
      const res = await postJson<PlanResponse>("/api/plan", { text }, ctrl.signal);
      setData(res);
      return res;
    } catch (err) {
      if (isAbort(err)) return null;
      toastLlmError(err);
      setError((err as Error).message);
      return null;
    } finally {
      if (ctrlRef.current === ctrl) setLoading(false);
    }
  }, []);

  return { run, data, loading, error };
}
