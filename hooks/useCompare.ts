"use client";

import { businessKey } from "@/lib/business";
import { modelKey } from "@/lib/model";
import type { Business, CompareRequest, CompareResponse, ModelWeights } from "@/types";
import { useDebouncedPost } from "@/hooks/useDebouncedPost";

export function useCompare(a: string | null, b: string | null, business: Business, weights: ModelWeights) {
  const ready = a && b && a !== b;
  const key = ready ? `${businessKey(business)}:${a}:${b}:${modelKey(weights)}` : null;
  const body: CompareRequest | null = ready
    ? { a, b, type: business.type, custom: business.custom ?? undefined, weights }
    : null;
  return useDebouncedPost<CompareResponse>("/api/compare", key, body);
}
