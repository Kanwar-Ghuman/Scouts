"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { businessKey, businessParams } from "@/lib/business";
import type { Business, DataSource, HexesResponse, HexFeatures } from "@/types";
import { fetchJson, HttpError, isAbort } from "@/hooks/fetchJson";

interface State {
  key: string | null;
  data: HexFeatures[] | null;
  source: DataSource | null;
  error: string | null;
}

/** `onCustomUnavailable` fires when a custom business can't be loaded (it needs live Snowflake). */
export function useHexFeatures(business: Business, onCustomUnavailable?: () => void) {
  const key = businessKey(business);
  const [state, setState] = useState<State>({ key: null, data: null, source: null, error: null });
  const [attempt, setAttempt] = useState(0);
  const onUnavailableRef = useRef(onCustomUnavailable);
  useEffect(() => {
    onUnavailableRef.current = onCustomUnavailable;
  });

  const query = businessParams(business).toString();
  const isCustom = business.type === "custom";

  useEffect(() => {
    const ctrl = new AbortController();
    fetchJson<HexesResponse>(`/api/hexes?${query}`, { signal: ctrl.signal })
      .then((r) => setState({ key, data: r.hexes, source: r.source, error: null }))
      .catch((err) => {
        if (isAbort(err)) return;
        setState({ key, data: null, source: null, error: (err as Error).message });
        if (isCustom && (!(err instanceof HttpError) || err.status >= 500)) onUnavailableRef.current?.();
      });
    return () => ctrl.abort();
  }, [key, query, isCustom, attempt]);

  const retry = useCallback(() => {
    setState((s) => ({ ...s, key: null, error: null }));
    setAttempt((n) => n + 1);
  }, []);

  const current = state.key === key;
  return {
    data: current ? state.data : null,
    source: current ? state.source : null,
    loading: !current,
    error: current ? state.error : null,
    retry,
  };
}
