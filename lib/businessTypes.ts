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

export function isBusinessType(value: unknown): value is BusinessTypeKey {
  return typeof value === "string" && value in BUSINESS_TYPES;
}
