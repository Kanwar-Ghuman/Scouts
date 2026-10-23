# Site Scout

![Site Scout](public/sitescout_twotone.svg)

A location decision model for small businesses in a given area. The LLM generates. The model decides. The LLM explains.

## What it does
- Describe your business in plain English. An open-weight LLM turns it into model settings.
- A transparent decision model scores every ~0.7 sq km area within 12 km of Cal Poly Pomona. Sliders let you change what matters and the map rescores instantly.
- Click a spot to see the exact math, nearby demand and the nearest competitors, plus a plain-English explanation.
- Compare two spots: the model picks, the LLM explains the tradeoff.
- Search a place you know and download a one-page report for a landlord or lender.

## The decision model
- demand = Σ weight × count, for students, workers, residents and shoppers
- raw = demand / (1 + competition weight × competitors)
- score = percentile of raw among nearby areas (0 to 100)

The model is deterministic and runs in the browser (`lib/model.ts`). The server recomputes scores itself before calling the LLM. The LLM never picks a winner.

## Architecture
Overture places → Snowflake (`PLACES` → `HEX_FEATURES` with H3) → Next.js API → `lib/model.ts` scores in the browser → Llama 3.3 70B via Cortex `AI_COMPLETE` for plain-English input and explanations → Neon Postgres cache (Prisma).

Reliability: the app falls back to exported data in `data/` if Snowflake is unreachable, retries dropped connections, rate-limits LLM routes, and caches every LLM result.

## Run locally
1. Use Node 20.19+, 22.12+ or 24+ (Prisma's requirement).
2. `npm install` (also generates the Prisma client and copies the MapLibre worker into `public/`)
3. Create `.env.local` with the names in `instructions/02-setup.md`, plus `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct) from Neon.
4. Create the cache table: `npm run db:migrate`. On networks that block port 5432, use `npm run db:migrate:https`.
5. `npm run dev` (set `MOCK_MODE=true` to run without Snowflake or Postgres)

## Logo files
In `public/`: `sitescout_twotone.svg` (original, dark background), `sitescout_wordmark_light.svg` (for white surfaces), `sitescout_wordmark_dark.svg` (transparent, for dark surfaces), `sitescout_mark.svg` (hex-pin icon) and `sitescout_mark_twotone.svg` (favicon, also `app/icon.svg`).

## Built with
Snowflake (Marketplace, H3, Cortex), CoCo, Llama 3.3 70B, Next.js, TypeScript, Tailwind CSS, shadcn/ui, Base UI, deck.gl, MapLibre GL, react-map-gl, h3-js, lucide-react, sonner, cmdk, Neon Postgres, Prisma (`@prisma/client`, `@prisma/adapter-neon`), dotenv, Vercel.

## Data and attribution
Places: Overture Maps Foundation. Basemap: © CARTO, © OpenStreetMap contributors.

## License
MIT
# Scouts
