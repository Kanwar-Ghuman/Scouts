import { BUSINESS_TYPES, closestPreset, type BusinessTypeKey } from "@/lib/businessTypes";
import type { Business, CustomSpec } from "@/types";

export const presetBusiness = (type: BusinessTypeKey): Business => ({ type, custom: null });
export const customBusiness = (custom: CustomSpec): Business => ({ type: "custom", custom });

export function businessLabel(b: Business): string {
  return b.type === "custom" ? b.custom?.label ?? "Custom business" : BUSINESS_TYPES[b.type].label;
}

export function businessShort(b: Business): string {
  return b.type === "custom" ? b.custom?.label ?? "Custom" : BUSINESS_TYPES[b.type].short;
}

export const sortedCategories = (c: CustomSpec) => [...c.categories].sort();

/** Identifies a business in cache keys: the preset name, or custom + label + sorted categories. */
export function businessKey(b: Business): string {
  if (b.type !== "custom" || !b.custom) return b.type;
  return `custom:${encodeURIComponent(b.custom.label.toLowerCase())}:${sortedCategories(b.custom).join(",")}`;
}

/** type=…, plus label and cats for custom businesses. */
export function businessParams(b: Business): URLSearchParams {
  const p = new URLSearchParams({ type: b.type });
  if (b.type === "custom" && b.custom) {
    p.set("label", b.custom.label);
    p.set("cats", b.custom.categories.join(","));
  }
  return p;
}

/** The preset to fall back to when a custom business can't be scored. */
export function fallbackPreset(b: Business): BusinessTypeKey {
  if (b.type !== "custom") return b.type;
  return closestPreset(`${b.custom?.label ?? ""} ${b.custom?.categories.join(" ") ?? ""}`);
}
