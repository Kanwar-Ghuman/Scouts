"use client";

import { businessKey } from "@/lib/business";
import { modelKey } from "@/lib/model";
import type { Business, ModelWeights, VerdictRequest, VerdictResponse } from "@/types";
import { useDebouncedPost } from "@/hooks/useDebouncedPost";

export function useVerdict(h3: string | null, business: Business, weights: ModelWeights) {
  const key = h3 ? `${businessKey(business)}:${h3}:${modelKey(weights)}` : null;
  const body: VerdictRequest | null = h3
    ? { h3, type: business.type, custom: business.custom ?? undefined, weights }
    : null;
  return useDebouncedPost<VerdictResponse>("/api/verdict", key, body);
}
