import { isBusinessType, type BusinessTypeKey } from "@/lib/businessTypes";
import { isDefault, modelKey, parseModelKey } from "@/lib/model";
import type { ModelWeights } from "@/types";

export interface UrlState {
  type: BusinessTypeKey;
  weights: ModelWeights;
  hex: string | null;
  a: string | null;
  b: string | null;
}

const h3Param = (v: string | null) => (v && /^[0-9a-f]{15}$/.test(v) ? v : null);

export function readUrlState(params: URLSearchParams): UrlState {
  const rawType = params.get("type");
  const type: BusinessTypeKey = isBusinessType(rawType) ? rawType : "boba";
  return {
    type,
    weights: parseModelKey(params.get("w"), type),
    hex: h3Param(params.get("hex")),
    a: h3Param(params.get("a")),
    b: h3Param(params.get("b")),
  };
}

export function toQuery(s: UrlState): string {
  const p = new URLSearchParams();
  p.set("type", s.type);
  if (!isDefault(s.weights, s.type)) p.set("w", modelKey(s.weights));
  if (s.hex) p.set("hex", s.hex);
  if (s.a) p.set("a", s.a);
  if (s.b) p.set("b", s.b);
  return p.toString();
}

export function writeUrlState(s: UrlState): void {
  const qs = toQuery(s);
  if (window.location.search.slice(1) === qs) return;
  window.history.replaceState(null, "", `${window.location.pathname}?${qs}`);
}

export function reportUrl(type: BusinessTypeKey, weights: ModelWeights, hex: string): string {
  const p = new URLSearchParams({ type, w: modelKey(weights), hex });
  return `/report?${p.toString()}`;
}
