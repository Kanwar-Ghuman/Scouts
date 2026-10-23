# 01. Overview

Read this before any other file. It's the contract for the whole app.

## How to use with Cursor
Build in order. In Agent mode, attach this file plus the step file:
```
@instructions/01-overview.md @instructions/04-api.md Do step 4.2
```
Finish the step, check its "Done when" line, commit, move on.

| File | Covers |
|---|---|
| `00-today.md` | MiniHacks runbook: commands, timeline, Cursor prompts |
| `01-overview.md` | Product, theme, architecture, decision model, data, API, types, priorities |
| `02-setup.md` | Repo, packages, env vars, connections |
| `03-data.md` | Snowflake: places, categories, hex features, app queries |
| `04-api.md` | Decision model code, data layer, mock mode, API routes, LLM |
| `05-ui.md` | Design system, map, priorities sliders, panels, compare |
| `06-ship.md` | Deploy, cache pre-warm, README |
| `07-pitch.md` | Pitch script, demo clicks, judge Q&A |

---

## 1. Product
**Site Scout** is a location decision model for small businesses. Describe your business in plain English and an LLM turns it into model settings, or pick a business type and set what matters to you yourself (students, workers, residents, shoppers, avoiding competition). The model scores every hexagon in the area. Click a spot to see exactly why it scored that way, then let an LLM explain the tradeoffs. Pick two spots to compare and the app tells you which one to choose and why. Search for a place you know ("Cal Poly", "Target") to jump there, and download a one-page report to bring to a landlord or lender.

**Pitch:** Chains pay consultants to choose locations. Small owners guess. Site Scout gives them a transparent decision model they can tune, with an LLM that explains every result in plain English.

**Demo area:** 12 km around lat `34.06`, lng `-117.79` (Pomona, Cal Poly, Diamond Bar, Claremont edge).

**Business types:** `boba`, `barber`, `laundromat`, `gym`, `taco`.

---

## 2. Theme: decision models + LLMs
**The LLM generates. The model decides. The LLM explains.**

| Part | What it does | Where |
|---|---|---|
| LLM (generate) | Turns a plain-English description ("boba shop near students, I hate competition") into a business type and model weights | `/api/plan`, `components/panel/IntentBox.tsx` |
| Decision model | Deterministic, weighted scoring of every area. Same input, same answer. | `lib/model.ts` (runs in browser and server) |
| User control | Sliders show the weights and let the owner adjust them, the map rescores live | `components/panel/PriorityControls.tsx` |
| Transparency | Every score shows its math | `components/panel/ScoreBreakdown.tsx` |
| LLM (explain) | Explains a spot's score and the tradeoff between two spots. Never picks the winner. | `lib/prompts.ts`, Llama 3.3 70B |

### Tracks (Bronco MiniHacks)
| Track | Requirement | How we meet it |
|---|---|---|
| Local Businesses | Help local businesses | Free site-selection tool plus an owner report for landlords and lenders |
| Best Use of Snowflake | CoCo + a free Snowflake dataset + open-weight AI | CoCo for data exploration (screenshots in README), Overture Places from the Marketplace, H3 in Snowflake, Llama via Cortex |
| Best Open-Source AI | Open-weight AI is central, public repo, open-source license | Llama 3.3 70B generates the weights and writes every explanation, MIT license |

Local Businesses judging: impact 5, functionality 5, UX 5, technical complexity 5, presentation 5, creativity 3.

Why the LLM never decides: LLMs are inconsistent with numbers and can invent facts. The LLM is good at understanding what a person wants, so it writes the inputs. The model makes the call with code. Then the LLM explains the result. Say this in the pitch.

---

## 3. Stack

| Part | Tool |
|---|---|
| App | Next.js App Router, TypeScript, Tailwind, shadcn/ui, Vercel |
| Map | `maplibre-gl`, `react-map-gl/maplibre`, `@deck.gl/react`, `H3HexagonLayer`, `ScatterplotLayer`, `TextLayer`, `h3-js` |
| Basemap | `https://basemaps.cartocdn.com/gl/positron-gl-style/style.json` (no key) |
| Data | Overture Maps Places (`OVERTURE_MAPS_PLACES`, free Snowflake Marketplace listing) |
| Features | Snowflake SQL + H3, stored in `HEX_FEATURES` |
| LLM | `AI_COMPLETE('llama3.3-70b', ...)` in Snowflake Cortex (open weights) |
| Cache | Neon Postgres, `@neondatabase/serverless` |
| Snowflake auth | `snowflake-sdk`, key pair, user `SITE_SCOUT_APP`, role `SYSADMIN` |
| Data exploration | CoCo CLI |

Don't add other AI APIs. Llama is the only LLM in the app.

---

## 4. Architecture
```
Snowflake (once):   Overture places -> PLACES -> HEX_FEATURES (counts per hex)

Browser:
  POST /api/plan {text}            -> Llama turns the owner's words into {type, weights}
  GET /api/hexes?type=boba         -> HEX_FEATURES rows (raw counts, no scores)
                                      falls back to data/hexes-<type>.json if Snowflake fails
  GET /api/search?q=cal poly       -> matching places -> fly to + select hex
  /report?type=&w=&hex=            -> printable owner report
  lib/model.ts scoreAll(weights)   -> scores + ranks, live as sliders move
  GET /api/hex/{h3}?type=boba      -> features + nearest competitors + driver breakdown
  POST /api/verdict {h3,type,weights}
       server: rescore with lib/model.ts -> cache? -> Llama explains -> cache
  POST /api/compare {a,b,type,weights}
       server: model picks winner -> cache? -> Llama explains tradeoff -> cache
```
Principles:
- Snowflake computes features once. Scoring lives only in `lib/model.ts`.
- Server never trusts scores from the client. It recomputes them from features and the weights.
- Only the server touches databases.
- `MOCK_MODE=true` runs the whole app with no Snowflake or Postgres.

---

## 5. The decision model

**Features per hex** (from Snowflake): `competitors`, `students`, `workers`, `residents`, `shoppers`.

**Driver groups:**

| Group | Example places |
|---|---|
| students | colleges, high schools, dorms |
| workers | offices, coworking, hospitals, banks |
| residents | apartments, grocery stores, convenience stores |
| shoppers | malls, shopping centers, retail, pharmacies |

**Weights:** each group 0 to 3 (step 0.5), plus `competition` 0 to 3 (how strongly to avoid competitors).

**Formula:**
```
demand = Σ weight[group] × count[group]
raw    = demand / (1 + competition × competitors)
score  = percentile rank of raw among all hexes for this type (0 to 100)
rank   = 1 for the highest raw
```

**Labels:** 70+ Strong, 40 to 69 Decent, under 40 Weak.

**Default weights:**

| Type | students | workers | residents | shoppers | competition |
|---|---|---|---|---|---|
| boba | 3 | 1 | 1 | 2 | 1 |
| barber | 1 | 1 | 3 | 2 | 1.5 |
| laundromat | 2 | 0 | 3 | 1 | 2 |
| gym | 2 | 2 | 2 | 0.5 | 1 |
| taco | 3 | 2 | 1 | 1 | 0.5 |

---

## 6. Repo structure
```
app/
  layout.tsx  page.tsx  globals.css  icon.svg
  api/health/route.ts
  api/hexes/route.ts
  api/hex/[id]/route.ts
  api/verdict/route.ts
  api/compare/route.ts
  api/plan/route.ts
  api/search/route.ts
  report/page.tsx            # printable owner report
  error.tsx                  # route-level error UI
components/
  SiteScout.tsx              # client root: state, URL sync, layout
  map/HexMap.tsx             # deck.gl + MapLibre, render only
  map/Legend.tsx
  panel/ControlPanel.tsx     # brand, type chips, priorities, summary, Top 3
  panel/TypeSelect.tsx
  panel/IntentBox.tsx        # plain-English input -> LLM -> type + weights
  panel/PriorityControls.tsx # the decision model sliders
  panel/TopSpots.tsx
  panel/HexPanel.tsx         # one spot: score, verdict, breakdown, drivers, competitors
  panel/ScoreBreakdown.tsx
  panel/VerdictCard.tsx
  panel/ComparePanel.tsx     # two spots side by side + LLM tradeoff
  panel/ScoreBadge.tsx
  panel/PlaceSearch.tsx      # jump to a known place
  StatusBadge.tsx            # Live data / Offline data
  ui/                        # shadcn
hooks/useHexFeatures.ts  hooks/useHexDetail.ts  hooks/useVerdict.ts  hooks/useCompare.ts
data/hexes-<type>.json       # real data exported from Snowflake, used by MOCK_MODE
lib/
  model.ts                   # THE decision model (shared client + server)
  businessTypes.ts           # keys, labels, icons
  snowflake.ts  db.ts        # connections
  hexData.ts                 # getHexFeatures(), getHexDetail()
  queries.ts                 # runtime SQL
  llm.ts                     # complete() with timeout + cleanup
  aiCache.ts                 # Postgres cache get/set
  prompts.ts                 # verdict + compare prompts and fallbacks
  mock.ts  colors.ts  format.ts  urlState.ts
  rateLimit.ts               # in-memory limiter for LLM routes
  validate.ts                # request body checks
types/index.ts
sql/01_places.sql  sql/02_categories.sql  sql/03_hex_features.sql
db/schema.sql
scripts/prewarm.mjs
docs/coco/
instructions/  .cursor/rules/site-scout.mdc  LICENSE  README.md
```

---

## 7. Data model

### Snowflake (`SITE_SCOUT.APP`)
- **PLACES**: PLACE_ID, NAME, CATEGORY, LAT, LNG, GEOG, H3 (res 8 string)
- **DRIVER_CATEGORIES**: CATEGORY, DRIVER_GROUP (`students` | `workers` | `residents` | `shoppers`)
- **COMPETITOR_CATEGORIES**: BUSINESS_TYPE, CATEGORY
- **HEX_FEATURES**: BUSINESS_TYPE, H3, COMPETITORS, STUDENTS, WORKERS, RESIDENTS, SHOPPERS, LAT, LNG

### Postgres
```sql
CREATE TABLE IF NOT EXISTS ai_cache (
  cache_key  TEXT PRIMARY KEY,
  text       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```
Keys: `v1:verdict:{type}:{h3}:{modelKey}` and `v1:compare:{type}:{a}:{b}:{modelKey}`.

---

## 8. Types (`types/index.ts`)
```ts
import type { BusinessTypeKey } from "@/lib/businessTypes";
export type { BusinessTypeKey };

export type DriverGroup = "students" | "workers" | "residents" | "shoppers";

export interface HexFeatures {
  h3: string;
  competitors: number;
  students: number;
  workers: number;
  residents: number;
  shoppers: number;
  lat: number;
  lng: number;
}

export interface ModelWeights {
  students: number;
  workers: number;
  residents: number;
  shoppers: number;
  competition: number;
}

export interface ScoredHex extends HexFeatures {
  demand: number;
  raw: number;
  score: number;   // 0-100 percentile
  rank: number;    // 1 = best
}

export interface Competitor { name: string; category: string; lat: number; lng: number; distanceM: number; }
export interface DriverCount { category: string; group: DriverGroup; count: number; }

export interface HexDetailResponse {
  features: HexFeatures;
  nearestCompetitors: Competitor[];   // up to 5
  driverBreakdown: DriverCount[];     // up to 8
}

export type DataSource = "live" | "offline" | "mock";
export interface HexesResponse { type: BusinessTypeKey; hexes: HexFeatures[]; source: DataSource; }

export interface PlaceResult { name: string; category: string; lat: number; lng: number; h3: string; }
export interface SearchResponse { results: PlaceResult[]; }

export interface VerdictRequest { h3: string; type: BusinessTypeKey; weights: ModelWeights; }
export interface VerdictResponse { verdict: string; cached: boolean; }

export interface CompareRequest { a: string; b: string; type: BusinessTypeKey; weights: ModelWeights; }
export interface CompareResponse { winner: string; explanation: string; cached: boolean; }

export interface PlanRequest { text: string; }
export interface PlanResponse {
  type: BusinessTypeKey;
  weights: ModelWeights;
  summary: string;      // one sentence: what the LLM understood
  fromLLM: boolean;     // false when the keyword fallback was used
}
```

---

## 9. API contracts
Every route: `export const runtime = "nodejs"`. LLM routes also `export const maxDuration = 30`. Unknown type returns 400. Log errors with `[api/<name>]`.

| Route | Returns | Notes |
|---|---|---|
| `GET /api/health` | `{ ok, reply }` | Proves Snowflake + Llama |
| `GET /api/hexes?type=` | `HexesResponse` | Raw features only. Falls back to `data/` files with `source: "offline"`. `Cache-Control: public, s-maxage=3600` only for live |
| `GET /api/search?q=` | `SearchResponse` | 2 to 60 chars. Empty results when offline |
| `GET /api/hex/{h3}?type=` | `HexDetailResponse` | 404 if not found |
| `POST /api/verdict` | `VerdictResponse` | Server rescores with weights. Cache, then Llama (15s timeout), fallback text on failure (not cached) |
| `POST /api/compare` | `CompareResponse` | Model picks the winner. Llama explains the tradeoff. Same cache and fallback rules |
| `POST /api/plan` | `PlanResponse` | Llama turns text into `{type, weights, summary}`. Always sanitized. Keyword fallback on failure. Not cached |

---

## 10. Priorities (if time runs short, cut from the bottom)
| Priority | Feature | Why |
|---|---|---|
| P0 | Map colored by model score, type chips | Core |
| P0 | Priority sliders rescoring live | The decision model, visible |
| P0 | IntentBox: words → LLM → weights | "LLM generates, model decides" |
| P0 | Hex panel with "Why this score" breakdown | Transparency |
| P1 | LLM verdict for a spot | The LLM explains |
| P1 | Top 3 spots with fly-to | Demo flow |
| P2 | Compare two spots + LLM tradeoff | Strongest demo moment |
| P2 | Place search + owner report | Local Businesses impact |
| P2 | Offline fallback, retries, rate limits, error boundary | Robustness (Functionality score) |
| P3 | URL state, mobile layout, polish | UX score |

## 11. Timeline
Today: follow `00-today.md`.

General order for a longer build:
| Time | Goal |
|---|---|
| 0:00 | `02-setup.md`: repo, env, `/api/health` replies |
| 0:30 | `03-data.md` 3.1 to 3.4 (one person) while the other does `04-api.md` 4.1 to 4.3 + `05-ui.md` 5.1 to 5.3 on mock data |
| 2:00 | Real data on. Sliders (5.4), IntentBox (4.7, 5.4b), hex panel (5.5) |
| 3:00 | Verdicts (4.5), Top 3 (5.6) |
| 4:00 | Compare (4.6, 5.7) |
| 5:00 | Polish (5.8), deploy + pre-warm (06) |
| last hour | README, rehearse pitch twice (07), submit early |

## 12. Definition of done
- [ ] Live URL, all 5 types render
- [ ] Moving a slider recolors the map and reorders Top 3 instantly
- [ ] Hex panel shows score math, drivers, competitors and an LLM verdict
- [ ] Compare two spots: model picks a winner, LLM explains the tradeoff
- [ ] Verdicts for demo spots load instantly (cached)
- [ ] Place search jumps to a known place
- [ ] Owner report prints cleanly
- [ ] With Snowflake unreachable, the map still loads ("Offline data" badge)
- [ ] URL reopens the same type, weights, spot and comparison
- [ ] `MOCK_MODE=true` demos end to end
- [ ] Public repo, MIT license, README with model, data, CoCo screenshots and credits
