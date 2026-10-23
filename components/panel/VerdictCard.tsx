"use client";

import { LlmText } from "@/components/panel/LlmText";
import { useVerdict } from "@/hooks/useVerdict";
import type { Business, ModelWeights } from "@/types";

interface Props {
  h3: string;
  business: Business;
  weights: ModelWeights;
}

export function VerdictCard({ h3, business, weights }: Props) {
  const { data, loading, error, retry } = useVerdict(h3, business, weights);
  return <LlmText label="AI explanation" text={data?.verdict} loading={loading} error={error} onRetry={retry} />;
}
