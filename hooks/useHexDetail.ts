"use client";

import { useCallback, useEffect, useState } from "react";
import type { BusinessTypeKey } from "@/lib/businessTypes";
import type { HexDetailResponse } from "@/types";
import { fetchJson, HttpError, isAbort } from "@/hooks/fetchJson";

interface State {
  key: string | null;
  data: HexDetailResponse | null;
  error: string | null;
}

export function useHexDetail(h3: string | null, type: BusinessTypeKey) {
  const key = h3 ? `${type}:${h3}` : null;
  const [state, setState] = useState<State>({ key: null, data: null, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!h3) return;
    const ctrl = new AbortController();
    const k = `${type}:${h3}`;
    fetchJson<HexDetailResponse>(`/api/hex/${h3}?type=${type}`, { signal: ctrl.signal })
      .then((data) => setState({ key: k, data, error: null }))
      .catch((err) => {
        if (isAbort(err)) return;
        const error = err instanceof HttpError && err.status === 404 ? "not_found" : (err as Error).message;
        setState({ key: k, data: null, error });
      });
    return () => ctrl.abort();
  }, [h3, type, attempt]);

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
