import { CupSoda, Dumbbell, Scissors, Utensils, WashingMachine, type LucideIcon } from "lucide-react";

export const BUSINESS_TYPES = {
  boba:       { label: "Boba / coffee shop", short: "Boba",       icon: CupSoda },
  barber:     { label: "Barber / salon",     short: "Barber",     icon: Scissors },
  laundromat: { label: "Laundromat",         short: "Laundromat", icon: WashingMachine },
  gym:        { label: "Gym",                short: "Gym",        icon: Dumbbell },
  taco:       { label: "Taco / fast casual", short: "Taco",       icon: Utensils },
} satisfies Record<string, { label: string; short: string; icon: LucideIcon }>;

export type BusinessTypeKey = keyof typeof BUSINESS_TYPES;
export const BUSINESS_TYPE_KEYS = Object.keys(BUSINESS_TYPES) as BusinessTypeKey[];

/** A preset, or "custom" (competitor categories chosen per business). */
export type TypeKey = BusinessTypeKey | "custom";

export const CUSTOM_LABEL_MAX = 40;
export const CUSTOM_CATEGORIES_MAX = 6;

export function isBusinessType(value: unknown): value is BusinessTypeKey {
  return typeof value === "string" && value in BUSINESS_TYPES;
}

export function isTypeKey(value: unknown): value is TypeKey {
  return value === "custom" || isBusinessType(value);
}

const KEYWORDS: [BusinessTypeKey, RegExp][] = [
  ["boba", /boba|tea|coffee|cafe|matcha/i],
  ["barber", /barber|hair|salon|beauty|nail/i],
  ["laundromat", /laundr|wash|dry ?clean/i],
  ["gym", /gym|fitness|yoga|workout|pilates/i],
  ["taco", /taco|food|restaurant|burrito|eat|grill/i],
];

/** The preset whose keywords best match the text. Defaults to boba. */
export function closestPreset(text: string): BusinessTypeKey {
  return KEYWORDS.find(([, re]) => re.test(text))?.[0] ?? "boba";
}
