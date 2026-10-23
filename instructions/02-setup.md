# 02. Setup

Goal: a running Next.js app that can reach Snowflake (including Llama) and Postgres.

Already done before the event: Snowflake warehouse `COMPUTE_WH`, database `SITE_SCOUT.APP`, Overture listing `OVERTURE_MAPS_PLACES` granted to SYSADMIN, app user `SITE_SCOUT_APP` with a key pair, CoCo connected as `site_scout`.

## 2.1 Scaffold
```bash
npx create-next-app@latest site-scout --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm
cd site-scout
npm i snowflake-sdk @neondatabase/serverless h3-js maplibre-gl react-map-gl @deck.gl/react @deck.gl/core @deck.gl/layers @deck.gl/geo-layers
npx shadcn@latest init
npx shadcn@latest add card select badge skeleton button separator popover tooltip scroll-area slider textarea command dialog sonner
```
If npm warns about missing deck.gl peer dependencies, install what it lists.

- Add `LICENSE` (MIT, team names).
- Add `*.p8` to `.gitignore`.
- Add `instructions/` and `.cursor/rules/site-scout.mdc`.
- `next.config.ts`:
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["snowflake-sdk"],
  // Ship the offline data files with the API functions on Vercel
  outputFileTracingIncludes: {
    "/api/**": ["./data/**"],
  },
};

export default nextConfig;
```
- Create a **public** GitHub repo, push, add teammates.

**Done when:** `npm run dev` works and the repo is on GitHub.

## 2.2 Environment variables
Connect the repo to Vercel and add Neon (Storage → Create Database → Neon, Free, US West) if not done yet. Then:
```bash
npm i -g vercel
vercel link
vercel env pull .env.local
```
`.env.local` should contain (add any that are missing, never with `NEXT_PUBLIC_`):
```
SNOWFLAKE_ACCOUNT=MPIXLRP-SC11436
SNOWFLAKE_USER=SITE_SCOUT_APP
SNOWFLAKE_ROLE=SYSADMIN
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_DATABASE=SITE_SCOUT
SNOWFLAKE_SCHEMA=APP
SNOWFLAKE_PRIVATE_KEY_B64=
DATABASE_URL=
MOCK_MODE=true
```
Keep `MOCK_MODE=true` until `HEX_FEATURES` exists (step 3.4).

## 2.3 `lib/snowflake.ts`
```ts
import snowflake from "snowflake-sdk";

snowflake.configure({ logLevel: "ERROR" });

let conn: snowflake.Connection | null = null;

async function getConnection(): Promise<snowflake.Connection> {
  if (conn && conn.isUp()) return conn;
  const privateKey = Buffer.from(process.env.SNOWFLAKE_PRIVATE_KEY_B64!, "base64").toString("utf8");
  conn = snowflake.createConnection({
    account: process.env.SNOWFLAKE_ACCOUNT!,
    username: process.env.SNOWFLAKE_USER!,
    authenticator: "SNOWFLAKE_JWT",
    privateKey,
    role: process.env.SNOWFLAKE_ROLE,
    warehouse: process.env.SNOWFLAKE_WAREHOUSE,
    database: process.env.SNOWFLAKE_DATABASE,
    schema: process.env.SNOWFLAKE_SCHEMA,
  });
  await new Promise<void>((resolve, reject) =>
    conn!.connect((err) => (err ? reject(err) : resolve()))
  );
  return conn;
}

function run<T>(c: snowflake.Connection, sqlText: string, binds: snowflake.Binds): Promise<T[]> {
  return new Promise((resolve, reject) => {
    c.execute({
      sqlText,
      binds,
      complete: (err, _stmt, rows) => (err ? reject(err) : resolve((rows ?? []) as T[])),
    });
  });
}

/** Runs a query. On a dropped connection, reconnects and retries once. SQL errors are not retried. */
export async function query<T = Record<string, unknown>>(
  sqlText: string,
  binds: snowflake.Binds = []
): Promise<T[]> {
  try {
    return await run<T>(await getConnection(), sqlText, binds);
  } catch (err) {
    const sqlState = (err as { sqlState?: string }).sqlState ?? "";
    if (sqlState.startsWith("42")) throw err; // compilation / access error: retrying won't help
    console.warn("[snowflake] retrying after error:", (err as Error).message);
    conn = null;
    return run<T>(await getConnection(), sqlText, binds);
  }
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)
    ),
  ]);
}
```

## 2.4 `lib/db.ts` + schema
```ts
import { neon } from "@neondatabase/serverless";

let client: ReturnType<typeof neon> | null = null;

/** Returns null when DATABASE_URL isn't set, so the app runs without Postgres. */
export function getSql() {
  if (!process.env.DATABASE_URL) return null;
  client ??= neon(process.env.DATABASE_URL);
  return client;
}
```
`db/schema.sql` (the `ai_cache` table from `01-overview.md` section 7). Run it in the Neon SQL editor (Vercel → Storage → database → Open in Neon).

## 2.5 `app/api/health/route.ts`
- `export const runtime = "nodejs"`.
- Run `SELECT AI_COMPLETE('llama3.3-70b', 'Say hi in 5 words') AS REPLY`.
- Return `{ ok: true, reply }` or `{ ok: false, error }` with 500.

**Done when:** `localhost:3000/api/health` shows a Llama reply.

## Troubleshooting
| Error | Fix |
|---|---|
| JWT token is invalid | Wrong user or key. User must be `SITE_SCOUT_APP`. Base64 key must have no line breaks. |
| Could not use warehouse | As ACCOUNTADMIN: `GRANT USAGE ON WAREHOUSE COMPUTE_WH TO ROLE SYSADMIN;` |
| Object does not exist | Object made as ACCOUNTADMIN, or SYSADMIN lacks the grant. |
| Model deprecated / not found | Use `llama3.3-70b`. Check `SHOW CORTEX BASE MODELS;` |
| Module not found / edge errors | Route missing `runtime = "nodejs"` or `serverExternalPackages` not set. |
