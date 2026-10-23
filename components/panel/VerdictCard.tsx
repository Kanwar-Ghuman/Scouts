"use client";

import { LlmText } from "@/components/panel/LlmText";
import { useVerdict } from "@/hooks/useVerdict";
import type { BusinessTypeKey } from "@/lib/businessTypes";
import type { ModelWeights } from "@/types";

interface Props {
  h3: string;
  type: BusinessTypeKey;
  weights: ModelWeights;
}

export function VerdictCard({ h3, type, weights }: Props) {
  const { data, loading, error, retry } = useVerdict(h3, type, weights);
  return <LlmText label="AI explanation" text={data?.verdict} loading={loading} error={error} onRetry={retry} />;
}
