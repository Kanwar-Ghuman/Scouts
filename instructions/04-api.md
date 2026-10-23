# 04. Decision model, API and LLM

Goal: the decision model as shared code, a typed data layer, mock mode, and all API routes.

## 4.1 Types + business types
- `types/index.ts`: copy exactly from `01-overview.md` section 8.
- `lib/businessTypes.ts`:
```ts
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
```

## 4.2 The decision model: `lib/model.ts`
This file is the heart of the project. It runs in the browser (live rescoring) and on the server (verdicts, compare). No React or Node imports.
```ts
import type { BusinessTypeKey } from "@/lib/businessTypes";
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

export const DEFAULT_WEIGHTS: Record<BusinessTypeKey, ModelWeights> = {
  boba:       { students: 3, workers: 1, residents: 1, shoppers: 2,   competition: 1 },
  barber:     { students: 1, workers: 1, residents: 3, shoppers: 2,   competition: 1.5 },
  laundromat: { students: 2, workers: 0, residents: 3, shoppers: 1,   competition: 2 },
  gym:        { students: 2, workers: 2, residents: 2, shoppers: 0.5, competition: 1 },
  taco:       { students: 3, workers: 2, residents: 1, shoppers: 1,   competition: 0.5 },
};

const WEIGHT_KEYS: (keyof ModelWeights)[] = ["students", "workers", "residents", "shoppers", "competition"];

export function sanitizeWeights(input: unknown, type: BusinessTypeKey): ModelWeights {
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

export function parseModelKey(key: string | null, type: BusinessTypeKey): ModelWeights {
  if (!key) return DEFAULT_WEIGHTS[type];
  const parts = key.split("-").map(Number);
  return sanitizeWeights(Object.fromEntries(WEIGHT_KEYS.map((k, i) => [k, parts[i]])), type);
}

export function isDefault(w: ModelWeights, type: BusinessTypeKey): boolean {
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

/** The model, not the LLM, picks the winner. */
export function pickWinner(a: ScoredHex, b: ScoredHex): ScoredHex {
  if (a.raw !== b.raw) return a.raw > b.raw ? a : b;
  return a.demand >= b.demand ? a : b;
}
```

**Done when:** `npx tsc --noEmit` passes.

## 4.3 Data layer, mock, hex routes
`lib/hexData.ts`:
- `getHexFeatures(type): Promise<HexFeatures[]>` runs `HEXES_SQL [type]`. Cache results in a module-level `Map<type, { at: number; rows }>` for 10 minutes.
- `getHexDetail(h3, type): Promise<HexDetailResponse | null>` runs `HEX_SQL [type, h3]`, `COMPETITORS_SQL [h3, type]`, `DRIVERS_SQL [h3]` with `Promise.all`. `null` if no hex row.
- Map UPPERCASE rows to camelCase here only. Wrap numbers in `Number()`. `DISTANCE_M` → `distanceM`, `DRIVER_GROUP` → `group`, `N` → `count`.
- `getScoredPair(type, weights, h3s: string[])`: loads features (cached), runs `scoreAll`, returns `{ scored, byH3 }`. Used by verdict and compare.

`lib/mock.ts` (no network):
- `loadOfflineFeatures(type)`: if `data/hexes-${type}.json` exists (read with `fs.readFileSync(path.join(process.cwd(), "data", ...))`), return its rows mapped from UPPERCASE keys to `HexFeatures` with `Number()`, else `null`. These are real Snowflake exports.
- `mockHexFeatures(type)` generates data when no file exists: `gridDisk(latLngToCell(34.06, -117.79, 8), 7)` from `h3-js`. For index `i`, type index `t`: `s = (k) => Math.abs(Math.sin((i + 1) * (t + 3 + k)))`. Students `round(s(1) * 6)`, workers `round(s(2) * 5)`, residents `round(s(3) * 8)`, shoppers `round(s(4) * 4)`, competitors `round(s(5) * 4)`. Center from `cellToLatLng`.
- `mockHexDetail(h3, type)`: matching features, 3 named competitors near the center, driver breakdown built from the counts.
- `mockVerdict()` and `mockCompare()`: realistic text built from the numbers.

`lib/format.ts`: `prettyCategory`, `formatDistance` (miles, "< 0.1 mi" under 160 m), `plural(n, word)`.

`app/api/hexes/route.ts`:
```ts
import { NextRequest } from "next/server";
import { isBusinessType } from "@/lib/businessTypes";
import { getHexFeatures } from "@/lib/hexData";
import { mockHexFeatures } from "@/lib/mock";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");
  if (!isBusinessType(type)) return Response.json({ error: "Unknown type" }, { status: 400 });

  if (process.env.MOCK_MODE === "true") {
    return Response.json({ type, hexes: loadOfflineFeatures(type) ?? mockHexFeatures(type), source: "mock" });
  }
  try {
    const hexes = await getHexFeatures(type);
    return Response.json({ type, hexes, source: "live" }, { headers: { "Cache-Control": "public, s-maxage=3600" } });
  } catch (err) {
    console.error("[api/hexes] live failed, using offline data", err);
    const offline = loadOfflineFeatures(type);
    if (offline) return Response.json({ type, hexes: offline, source: "offline" });
    return Response.json({ error: "Could not load hexes" }, { status: 500 });
  }
}
```
(Import `loadOfflineFeatures` and `mockHexFeatures` from `@/lib/mock`.)

**Offline fallback everywhere:** `loadOfflineFeatures(type): HexFeatures[] | null` in `lib/mock.ts` reads `data/hexes-${type}.json` (the real Snowflake export) and caches it in memory. Use it as the fallback in:
- `getScoredPair()`: if `getHexFeatures` throws, score the offline features instead, so verdict and compare still work (the LLM part will return fallback text if Snowflake is down).
- `/api/hex/[id]`: if Snowflake throws, return `{ features, nearestCompetitors: [], driverBreakdown }` from the offline row, where `driverBreakdown` lists each non-zero group as `{ category: group, group, count }`.

`app/api/hex/[id]/route.ts`: same pattern. `const { id } = await params`. 404 `{ error: "Not found" }` on null.

**Done when:** `/api/hexes?type=boba` returns features, `?type=pizza` returns 400, `/api/hex/<h3>?type=boba` returns detail.

## 4.4 LLM helpers
`lib/llm.ts`:
```ts
import { query, withTimeout } from "@/lib/snowflake";

export const LLM_MODEL = "llama3.3-70b";

export function cleanText(text: unknown): string {
  return String(text ?? "").trim().replace(/^["']|["']$/g, "").replace(/\s+/g, " ");
}

export async function complete(prompt: string, timeoutMs = 15000): Promise<string> {
  const rows = await withTimeout(
    query<{ REPLY: string }>(`SELECT AI_COMPLETE('${LLM_MODEL}', ?) AS REPLY`, [prompt]),
    timeoutMs
  );
  const text = cleanText(rows[0]?.REPLY);
  if (!text) throw new Error("Empty LLM reply");
  return text;
}
```

`lib/aiCache.ts`: `getCached(key): Promise<string | null>` and `setCached(key, text): Promise<void>`. If `DATABASE_URL` is missing, both do nothing (return `null`). Otherwise wrap Neon calls in try/catch and log failures; never throw. Insert with `ON CONFLICT (cache_key) DO NOTHING`. Create the Neon client lazily inside these functions, not at import time, so a missing `DATABASE_URL` can't crash the app. Use the same lazy pattern in `lib/db.ts`.

`lib/prompts.ts`:
```ts
import { BUSINESS_TYPES, type BusinessTypeKey } from "@/lib/businessTypes";
import { DRIVER_GROUPS, scoreLabel, weightWord } from "@/lib/model";
import type { HexDetailResponse, ModelWeights, ScoredHex } from "@/types";

function priorities(w: ModelWeights) {
  return {
    ...Object.fromEntries(DRIVER_GROUPS.map((g) => [g.label.toLowerCase(), weightWord(w[g.key])])),
    avoidingCompetition: weightWord(w.competition),
  };
}

function spotData(h: ScoredHex, total: number) {
  return {
    score: h.score,
    scoreMeaning: `better than ${h.score}% of ${total} nearby areas`,
    rank: h.rank,
    students: h.students, workers: h.workers, residents: h.residents, shoppers: h.shoppers,
    competitors: h.competitors,
  };
}

const RULES = [
  "- Use ONLY the data below. Do not invent rent, income, foot traffic, population or business names.",
  "- Plain text. No markdown, lists or quotes. Under 75 words.",
];

export function buildVerdictPrompt(
  type: BusinessTypeKey, h: ScoredHex, total: number, w: ModelWeights, detail: HexDetailResponse
): string {
  const label = BUSINESS_TYPES[type].label;
  const data = {
    business: label,
    ownerPriorities: priorities(w),
    spot: spotData(h, total),
    demandSources: detail.driverBreakdown,
    nearestCompetitors: detail.nearestCompetitors.map((c) => ({ name: c.name, meters: c.distanceM })),
  };
  return [
    "A decision model scored an area (about 0.7 sq km) for someone opening a small business.",
    `Explain the model's result for a ${label} to the owner.`,
    "",
    "Rules:",
    ...RULES,
    "- Exactly 3 sentences.",
    `- Sentence 1 starts with exactly "${scoreLabel(h.score)} spot."`,
    "- Sentence 2 explains the main reason, tied to the owner's priorities, citing at least one number.",
    "- Sentence 3 names one risk or one thing to check in person.",
    "",
    "Data:",
    JSON.stringify(data),
  ].join("\n");
}

export function buildComparePrompt(
  type: BusinessTypeKey, a: ScoredHex, b: ScoredHex, winnerLabel: "A" | "B", total: number, w: ModelWeights
): string {
  const label = BUSINESS_TYPES[type].label;
  const data = { business: label, ownerPriorities: priorities(w), spotA: spotData(a, total), spotB: spotData(b, total) };
  return [
    "A decision model compared two areas for someone opening a small business.",
    `The model chose Spot ${winnerLabel}. Do not change or question the choice. Explain it for a ${label}.`,
    "",
    "Rules:",
    ...RULES,
    "- Exactly 3 sentences.",
    `- Sentence 1 starts with exactly "Spot ${winnerLabel}."`,
    "- Sentence 2 states the key tradeoff between the two spots with numbers from both.",
    `- Sentence 3 says when Spot ${winnerLabel === "A" ? "B" : "A"} would be the better choice instead.`,
    "",
    "Data:",
    JSON.stringify(data),
  ].join("\n");
}

export function fallbackVerdict(h: ScoredHex, total: number): string {
  return `${scoreLabel(h.score)} spot. It ranks #${h.rank} of ${total} nearby areas with ${h.competitors} competitors. Visit at different times of day before deciding.`;
}

export function fallbackCompare(winner: ScoredHex, loser: ScoredHex, winnerLabel: "A" | "B"): string {
  return `Spot ${winnerLabel}. It scores ${winner.score} vs ${loser.score} under your priorities. Visit both before deciding.`;
}
```

## 4.5 Verdict route: `app/api/verdict/route.ts`
```ts
export const runtime = "nodejs";
export const maxDuration = 30;
```
1. Parse `{ h3, type, weights }`. 400 if `h3` isn't a string or type is invalid. `w = sanitizeWeights(weights, type)`.
2. Mock mode: wait 600 ms, return `{ verdict: mockVerdict(...), cached: false }`.
3. `key = v1:verdict:${type}:${h3}:${modelKey(w)}`. Cached → `{ verdict, cached: true }`.
4. `getScoredPair(type, w, [h3])` and `getHexDetail(h3, type)`. 404 if either is missing.
5. `complete(buildVerdictPrompt(...))` → `setCached` → `{ verdict, cached: false }`.
6. LLM failure: log, return `{ verdict: fallbackVerdict(...), cached: false }` with 200. Don't cache.

## 4.6 Compare route: `app/api/compare/route.ts`
Same runtime and duration.
1. Parse `{ a, b, type, weights }`. 400 if `a === b` or invalid.
2. Score both with `getScoredPair`. 404 if either is missing.
3. `winner = pickWinner(A, B)`, `winnerLabel = winner.h3 === a ? "A" : "B"`.
4. Cache key `v1:compare:${type}:${a}:${b}:${modelKey(w)}`. Hit → return.
5. `complete(buildComparePrompt(...))` → cache → `{ winner: winner.h3, explanation, cached: false }`.
6. LLM failure: return `fallbackCompare(...)` with 200, not cached.

**Done when:** verdict and compare each take a few seconds the first time and come back `cached: true` instantly the second time.

## 4.7 LLM generates the weights: `/api/plan`
This is the "LLM generates, model decides" half of the theme. The LLM only writes inputs. Code validates them and the model makes the call.

Add to `lib/prompts.ts`:
```ts
export function buildPlanPrompt(text: string): string {
  return [
    "You convert a small business owner's description into settings for a location decision model.",
    "Return ONLY one JSON object. No markdown, no other text.",
    "",
    'Schema: {"type": "boba" | "barber" | "laundromat" | "gym" | "taco", "weights": {"students": number|null, "workers": number|null, "residents": number|null, "shoppers": number|null, "competition": number|null}, "summary": string}',
    "",
    "Rules:",
    "- type: closest match. Coffee, tea and cafes are boba. Hair, nails and beauty are barber. Restaurants and food are taco. Fitness and yoga are gym.",
    "- Weights are 0 to 3 in steps of 0.5. 0 = ignore, 1 = low, 2 = medium, 3 = very important.",
    "- students = colleges and schools. workers = offices and hospitals. residents = people living nearby. shoppers = malls and retail.",
    "- competition = how strongly to avoid areas that already have similar businesses.",
    "- Use null for anything the owner does not mention.",
    '- summary: one short sentence starting with "Looking for" that restates what they want.',
    "",
    "Owner's description:",
    JSON.stringify(text),
  ].join("\n");
}
```

`app/api/plan/route.ts`:
```ts
export const runtime = "nodejs";
export const maxDuration = 30;
```
- Keyword fallback:
```ts
const KEYWORDS: [BusinessTypeKey, RegExp][] = [
  ["boba", /boba|tea|coffee|cafe|matcha/i],
  ["barber", /barber|hair|salon|beauty|nail/i],
  ["laundromat", /laundr|wash|dry ?clean/i],
  ["gym", /gym|fitness|yoga|workout|pilates/i],
  ["taco", /taco|food|restaurant|burrito|eat|grill/i],
];
const keywordType = (text: string): BusinessTypeKey =>
  KEYWORDS.find(([, re]) => re.test(text))?.[0] ?? "boba";
```
Flow:
1. `text` must be a string, 3 to 400 characters after trim. Else 400.
2. Mock mode: wait 500 ms, return keyword type, `DEFAULT_WEIGHTS[type]`, summary `Looking for a good spot for a ${label}.`, `fromLLM: false`.
3. `reply = await complete(buildPlanPrompt(text), 12000)`.
4. Extract JSON with `reply.match(/\{[\s\S]*\}/)`, then `JSON.parse`.
5. `type = isBusinessType(json.type) ? json.type : keywordType(text)`.
6. Drop `null` and `undefined` weights **before** `sanitizeWeights` (because `Number(null)` is 0), so missing groups keep the type's defaults:
```ts
const given = Object.fromEntries(
  Object.entries(json.weights ?? {}).filter(([, v]) => v !== null && v !== undefined)
);
const weights = sanitizeWeights(given, type);
```
7. `summary` = cleaned `json.summary`, max 160 chars, or the default sentence.
8. Return `{ type, weights, summary, fromLLM: true }`.
9. Any error in 3 to 7: log, return the keyword fallback with `fromLLM: false` and status 200.

Not cached: each description is different and the call is fast.

**Done when:**
```bash
curl -X POST localhost:3000/api/plan -H "Content-Type: application/json" \
  -d '{"text":"laundromat for apartment renters, I really want to avoid competition"}'
```
returns `type: "laundromat"`, high `residents`, competition 2.5 or 3, and a summary.

## 4.8 Place search: `/api/search`
`app/api/search/route.ts` (`runtime = "nodejs"`):
1. `q` from query string, trimmed. Length 2 to 60, else `{ results: [] }`.
2. Mock mode: filter a small hard-coded list (Cal Poly Pomona, Pomona College, Diamond Bar Center, Claremont Village, Downtown Pomona) by `includes`. Use real coordinates and compute `h3` with `latLngToCell(lat, lng, 8)`.
3. Live: `SEARCH_SQL` with binds `[`%${q}%`, `${q}%`]`. Map to `PlaceResult`.
4. On Snowflake error: return `{ results: [] }` with 200 and log.

Header `Cache-Control: public, s-maxage=600`.

**Done when:** `/api/search?q=cal poly` returns places with `h3`.

## 4.9 Robustness: rate limits + validation
`lib/rateLimit.ts`: in-memory sliding window per IP.
```ts
const hits = new Map<string, number[]>();

export function rateLimit(req: Request, limit = 20, windowMs = 60_000): boolean {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length <= limit;
}
```
Use it at the top of `/api/plan`, `/api/verdict`, `/api/compare`:
```ts
if (!rateLimit(req)) return Response.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
```
Cached LLM results don't count: check the cache before calling `rateLimit` in verdict and compare.

`lib/validate.ts`:
- `readJson(req)`: `await req.json()` inside try/catch, returns `null` on bad JSON.
- `isH3(value)`: string matching `/^[0-9a-f]{15}$/`.
- Use them in every POST route. Bad input returns 400 with a clear `error` message.

Every route returns JSON errors in the same shape: `{ error: string }`.

## Test
```bash
curl "localhost:3000/api/health"
curl "localhost:3000/api/hexes?type=boba" | head -c 400
curl "localhost:3000/api/hex/<h3>?type=boba"
curl -X POST localhost:3000/api/verdict -H "Content-Type: application/json" \
  -d '{"h3":"<h3>","type":"boba","weights":{"students":3,"workers":1,"residents":1,"shoppers":2,"competition":1}}'
curl -X POST localhost:3000/api/compare -H "Content-Type: application/json" \
  -d '{"a":"<h3>","b":"<other h3>","type":"boba","weights":{"students":3,"workers":1,"residents":1,"shoppers":2,"competition":1}}'
```
