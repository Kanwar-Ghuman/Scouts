import { businessParams, customBusiness, presetBusiness } from "@/lib/business";
import { isBusinessType } from "@/lib/businessTypes";
import { isDefault, modelKey, parseModelKey } from "@/lib/model";
import { readCustomParams } from "@/lib/validate";
import type { Business, ModelWeights } from "@/types";

export interface UrlState {
  business: Business;
  weights: ModelWeights;
  hex: string | null;
  a: string | null;
  b: string | null;
}

const h3Param = (v: string | null) => (v && /^[0-9a-f]{15}$/.test(v) ? v : null);

function readBusiness(params: URLSearchParams): Business {
  const type = params.get("type");
  if (type === "custom") {
    const custom = readCustomParams(params);
    if (custom) return customBusiness(custom);
  }
  return presetBusiness(isBusinessType(type) ? type : "boba");
}

export function readUrlState(params: URLSearchParams): UrlState {
  const business = readBusiness(params);
  return {
    business,
    weights: parseModelKey(params.get("w"), business.type),
    hex: h3Param(params.get("hex")),
    a: h3Param(params.get("a")),
    b: h3Param(params.get("b")),
  };
}

export function toQuery(s: UrlState): string {
  const p = businessParams(s.business);
  if (!isDefault(s.weights, s.business.type)) p.set("w", modelKey(s.weights));
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

export function reportUrl(business: Business, weights: ModelWeights, hex: string): string {
  const p = businessParams(business);
  p.set("w", modelKey(weights));
  p.set("hex", hex);
  return `/report?${p.toString()}`;
}
