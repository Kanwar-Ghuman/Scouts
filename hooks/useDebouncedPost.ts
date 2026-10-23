"use client";

import { useCallback, useEffect, useState } from "react";
import { isAbort, postJson, toastLlmError } from "@/hooks/fetchJson";

const DEBOUNCE_MS = 500;
const memo = new Map<string, unknown>();

interface State<T> {
  key: string | null;
  data: T | null;
  error: string | null;
}

/**
 * POSTs `body` whenever `key` changes, debounced, ignoring stale responses.
 * Responses are memoized per key so revisiting a spot is instant.
 */
export function useDebouncedPost<T>(url: string, key: string | null, body: unknown) {
  const [state, setState] = useState<State<T>>({ key: null, data: null, error: null });
  const [attempt, setAttempt] = useState(0);

  const memoKey = key ? `${url}|${key}` : null;
  const memoized = memoKey && memo.has(memoKey) ? (memo.get(memoKey) as T) : null;

  useEffect(() => {
    if (!key || !memoKey || memo.has(memoKey)) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      postJson<T>(url, body, ctrl.signal)
        .then((data) => {
          memo.set(memoKey, data);
          setState({ key, data, error: null });
        })
        .catch((err) => {
          if (isAbort(err)) return;
          toastLlmError(err);
          setState({ key, data: null, error: (err as Error).message });
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
    // body is derived from key; key changes are what should trigger a refetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, key, memoKey, attempt]);

  const retry = useCallback(() => {
    setState((s) => ({ ...s, key: null }));
    setAttempt((n) => n + 1);
  }, []);

  if (memoized) return { data: memoized, loading: false, error: null, retry };
  const current = key !== null && state.key === key;
  return {
    data: current ? state.data : null,
    loading: key !== null && !current,
    error: current ? state.error : null,
    retry,
  };
}
