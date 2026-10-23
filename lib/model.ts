import type { TypeKey } from "@/lib/businessTypes";
import type { DriverGroup, HexFeatures, ModelWeights, ScoredHex } from "@/types";

export const DRIVER_GROUPS: { key: DriverGroup; label: string; hint: string }[] = [
  { key: "students",  label: "Students",  hint: "Colleges and high schools" },
  { key: "workers",   label: "Workers",   hint: "Offices, hospitals, banks" },
  { key: "residents", label: "Residents", hint: "Apartments and neighborhood stores" },
  { key: "shoppers",  label: "Shoppers",  hint: "Malls, retail, pharmacies" },
];

export const WEIGHT_MIN = 0;
export const WEIGHT_MAX = 3;
export const WEIGHT_STEP = 0.5;

export const DEFAULT_WEIGHTS: Record<TypeKey, ModelWeights> = {
  boba:       { students: 3, workers: 1, residents: 1, shoppers: 2,   competition: 1 },
  barber:     { students: 1, workers: 1, residents: 3, shoppers: 2,   competition: 1.5 },
  laundromat: { students: 2, workers: 0, residents: 3, shoppers: 1,   competition: 2 },
  gym:        { students: 2, workers: 2, residents: 2, shoppers: 0.5, competition: 1 },
  taco:       { students: 3, workers: 2, residents: 1, shoppers: 1,   competition: 0.5 },
  custom:     { students: 1, workers: 1, residents: 1, shoppers: 1,   competition: 1 },
};

const WEIGHT_KEYS: (keyof ModelWeights)[] = ["students", "workers", "residents", "shoppers", "competition"];

export function sanitizeWeights(input: unknown, type: TypeKey): ModelWeights {
  const base = DEFAULT_WEIGHTS[type];
  const obj = (input ?? {}) as Record<string, unknown>;
  const out = { ...base };
  for (const k of WEIGHT_KEYS) {
    const n = Number(obj[k]);
    if (Number.isFinite(n)) {
      const clamped = Math.min(WEIGHT_MAX, Math.max(WEIGHT_MIN, n));
      out[k] = Math.round(clamped / WEIGHT_STEP) * WEIGHT_STEP;
    }
  }
  return out;
}

export function modelKey(w: ModelWeights): string {
  return WEIGHT_KEYS.map((k) => w[k]).join("-");
}

export function parseModelKey(key: string | null, type: TypeKey): ModelWeights {
  if (!key) return DEFAULT_WEIGHTS[type];
  const parts = key.split("-").map(Number);
  return sanitizeWeights(Object.fromEntries(WEIGHT_KEYS.map((k, i) => [k, parts[i]])), type);
}

export function isDefault(w: ModelWeights, type: TypeKey): boolean {
  return modelKey(w) === modelKey(DEFAULT_WEIGHTS[type]);
}

export function demandOf(f: HexFeatures, w: ModelWeights): number {
  return DRIVER_GROUPS.reduce((sum, g) => sum + w[g.key] * f[g.key], 0);
}

export function rawScore(f: HexFeatures, w: ModelWeights): number {
  return demandOf(f, w) / (1 + w.competition * f.competitors);
}

function countBelow(sorted: number[], x: number): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function scoreAll(hexes: HexFeatures[], w: ModelWeights): ScoredHex[] {
  const rows = hexes.map((f) => ({ ...f, demand: demandOf(f, w), raw: rawScore(f, w), score: 0, rank: 0 }));
  const sorted = rows.map((r) => r.raw).sort((a, b) => a - b);
  const n = rows.length;
  for (const r of rows) r.score = n > 1 ? Math.round((100 * countBelow(sorted, r.raw)) / (n - 1)) : 100;
  rows.sort((a, b) => b.raw - a.raw || b.demand - a.demand || a.h3.localeCompare(b.h3));
  rows.forEach((r, i) => (r.rank = i + 1));
  return rows;
}

export type ScoreLabel = "Strong" | "Decent" | "Weak";
export function scoreLabel(score: number): ScoreLabel {
  return score >= 70 ? "Strong" : score >= 40 ? "Decent" : "Weak";
}

export function weightWord(v: number): string {
  if (v === 0) return "ignored";
  if (v <= 1) return "low";
  if (v <= 2) return "medium";
  return "high";
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** Human-readable math for the "Why this score" panel. */
export function explainScore(h: ScoredHex, w: ModelWeights, total: number): string[] {
  const parts = DRIVER_GROUPS
    .filter((g) => w[g.key] > 0 && h[g.key] > 0)
    .map((g) => `${fmt(w[g.key])} × ${h[g.key]} ${g.label.toLowerCase()}`);
  return [
    `Demand = ${parts.length ? parts.join(" + ") : "0"} = ${fmt(h.demand)}`,
    `Competition = 1 + ${fmt(w.competition)} × ${h.competitors} competitors = ${fmt(1 + w.competition * h.competitors)}`,
    `Raw score = ${fmt(h.demand)} ÷ ${fmt(1 + w.competition * h.competitors)} = ${h.raw.toFixed(2)}`,
    `Better than ${h.score}% of ${total} nearby areas · rank #${h.rank}`,
  ];
}

/** Each group's share of demand (weight × count), largest first. */
export function contributions(h: HexFeatures, w: ModelWeights): { key: DriverGroup; label: string; value: number }[] {
  return DRIVER_GROUPS
    .map((g) => ({ key: g.key, label: g.label, value: w[g.key] * h[g.key] }))
    .sort((a, b) => b.value - a.value);
}

/** The model, not the LLM, picks the winner. */
export function pickWinner(a: ScoredHex, b: ScoredHex): ScoredHex {
  if (a.raw !== b.raw) return a.raw > b.raw ? a : b;
  return a.demand >= b.demand ? a : b;
}
