"use client";

import type { BusinessTypeKey } from "@/lib/businessTypes";
import { modelKey } from "@/lib/model";
import type { ModelWeights, VerdictRequest, VerdictResponse } from "@/types";
import { useDebouncedPost } from "@/hooks/useDebouncedPost";

export function useVerdict(h3: string | null, type: BusinessTypeKey, weights: ModelWeights) {
  const key = h3 ? `${type}:${h3}:${modelKey(weights)}` : null;
  const body: VerdictRequest | null = h3 ? { h3, type, weights } : null;
  return useDebouncedPost<VerdictResponse>("/api/verdict", key, body);
}
