"use client";

import { useCallback, useEffect, useState } from "react";
import { businessKey, businessParams } from "@/lib/business";
import type { Business, HexDetailResponse } from "@/types";
import { fetchJson, HttpError, isAbort } from "@/hooks/fetchJson";

interface State {
  key: string | null;
  data: HexDetailResponse | null;
  error: string | null;
}

export function useHexDetail(h3: string | null, business: Business) {
  const key = h3 ? `${businessKey(business)}:${h3}` : null;
  const query = businessParams(business).toString();
  const [state, setState] = useState<State>({ key: null, data: null, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!h3 || !key) return;
    const ctrl = new AbortController();
    fetchJson<HexDetailResponse>(`/api/hex/${h3}?${query}`, { signal: ctrl.signal })
      .then((data) => setState({ key, data, error: null }))
      .catch((err) => {
        if (isAbort(err)) return;
        const error = err instanceof HttpError && err.status === 404 ? "not_found" : (err as Error).message;
        setState({ key, data: null, error });
      });
    return () => ctrl.abort();
  }, [h3, key, query, attempt]);

  const retry = useCallback(() => {
    setState((s) => ({ ...s, key: null }));
    setAttempt((n) => n + 1);
  }, []);
  const current = key !== null && state.key === key;
  return {
    data: current ? state.data : null,
    loading: key !== null && !current,
    error: current ? state.error : null,
    retry,
  };
}
