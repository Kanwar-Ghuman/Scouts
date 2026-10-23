"use client";

import type { BusinessTypeKey } from "@/lib/businessTypes";
import { modelKey } from "@/lib/model";
import type { CompareRequest, CompareResponse, ModelWeights } from "@/types";
import { useDebouncedPost } from "@/hooks/useDebouncedPost";

export function useCompare(a: string | null, b: string | null, type: BusinessTypeKey, weights: ModelWeights) {
  const ready = a && b && a !== b;
  const key = ready ? `${type}:${a}:${b}:${modelKey(weights)}` : null;
  const body: CompareRequest | null = ready ? { a, b, type, weights } : null;
  return useDebouncedPost<CompareResponse>("/api/compare", key, body);
}
