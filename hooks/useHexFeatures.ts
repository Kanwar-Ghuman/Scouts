"use client";

import { useCallback, useEffect, useState } from "react";
import type { BusinessTypeKey } from "@/lib/businessTypes";
import type { DataSource, HexesResponse, HexFeatures } from "@/types";
import { fetchJson, isAbort } from "@/hooks/fetchJson";

interface State {
  type: BusinessTypeKey | null;
  data: HexFeatures[] | null;
  source: DataSource | null;
  error: string | null;
}

export function useHexFeatures(type: BusinessTypeKey) {
  const [state, setState] = useState<State>({ type: null, data: null, source: null, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchJson<HexesResponse>(`/api/hexes?type=${type}`, { signal: ctrl.signal })
      .then((r) => setState({ type, data: r.hexes, source: r.source, error: null }))
      .catch((err) => {
        if (!isAbort(err)) setState({ type, data: null, source: null, error: (err as Error).message });
      });
    return () => ctrl.abort();
  }, [type, attempt]);

  const retry = useCallback(() => {
    setState((s) => ({ ...s, type: null, error: null }));
    setAttempt((n) => n + 1);
  }, []);

  const current = state.type === type;
  return {
    data: current ? state.data : null,
    source: current ? state.source : null,
    loading: !current,
    error: current ? state.error : null,
    retry,
  };
}
