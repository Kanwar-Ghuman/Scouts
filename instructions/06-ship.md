# 06. Ship

Goal: live URL, warm LLM cache, a README that clearly meets all three tracks, submitted by 6:20.

## 6.1 Deploy (4:45)
```bash
git add -A && git commit -m "[app] ready to deploy" && git push
vercel env add SNOWFLAKE_PRIVATE_KEY_B64 production < <(base64 -i ~/.snowflake/rsa_key.p8 | tr -d '\n')
```
Then in the Vercel dashboard → Settings → Environment Variables, add the rest (same values as `.env.local`): `SNOWFLAKE_ACCOUNT`, `SNOWFLAKE_USER`, `SNOWFLAKE_ROLE`, `SNOWFLAKE_WAREHOUSE`, `SNOWFLAKE_DATABASE`, `SNOWFLAKE_SCHEMA`, `MOCK_MODE=false`, and `DATABASE_URL` if you use Neon.
```bash
vercel --prod
```
Open the live URL. Check: map loads with "Live data", a slider recolors, the describe box works, a spot opens with a verdict, compare works, search works, the report prints.

If the build fails, read the log: `vercel logs <deployment-url>`. Most failures are a missing env var or a route without `runtime = "nodejs"`.

## 6.2 Pre-warm the LLM cache (5:00)
`scripts/prewarm.mjs`:
```js
// Usage: node scripts/prewarm.mjs https://your-app.vercel.app
const base = process.argv[2];
if (!base) throw new Error("Pass the site URL");

const DEFAULTS = {
  boba:       { students: 3, workers: 1, residents: 1, shoppers: 2,   competition: 1 },
  barber:     { students: 1, workers: 1, residents: 3, shoppers: 2,   competition: 1.5 },
  laundromat: { students: 2, workers: 0, residents: 3, shoppers: 1,   competition: 2 },
  gym:        { students: 2, workers: 2, residents: 2, shoppers: 0.5, competition: 1 },
  taco:       { students: 3, workers: 2, residents: 1, shoppers: 1,   competition: 0.5 },
};

const post = (path, body) =>
  fetch(`${base}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    .then((r) => r.json());

const raw = (f, w) =>
  (w.students * f.students + w.workers * f.workers + w.residents * f.residents + w.shoppers * f.shoppers) /
  (1 + w.competition * f.competitors);

for (const [type, weights] of Object.entries(DEFAULTS)) {
  const { hexes } = await (await fetch(`${base}/api/hexes?type=${type}`)).json();
  const top = hexes.sort((a, b) => raw(b, weights) - raw(a, weights)).slice(0, 6);
  for (const hex of top) {
    const { cached, verdict } = await post("/api/verdict", { h3: hex.h3, type, weights });
    console.log(type, "verdict", cached ? "cached" : "new", (verdict ?? "").slice(0, 60));
  }
  const { cached, explanation } = await post("/api/compare", { a: top[0].h3, b: top[1].h3, type, weights });
  console.log(type, "compare", cached ? "cached" : "new", (explanation ?? "").slice(0, 60));
  await new Promise((r) => setTimeout(r, 3000)); // stay under the rate limit
}
```
Run it twice. The second run should say `cached` everywhere. Then click through the exact demo path in `07-pitch.md` on the live site.

## 6.3 README (5:15)
Screenshot the live site with a compare open → `docs/screenshot.png`. Put 2 to 4 CoCo screenshots in `docs/coco/`.
```markdown
# Site Scout
A location decision model for small businesses. The LLM generates. The model decides. The LLM explains.

![Site Scout](docs/screenshot.png)

**Live:** <vercel url>  ·  **Demo video:** <link>

## The problem
Chains pay consultants to choose where to open. Small owners guess, and a bad location can sink a business before it opens.

## What it does
- Describe your business in plain English. An open-weight LLM turns it into model settings.
- A transparent decision model scores every ~0.7 sq km area nearby. Sliders let you change what matters and the map rescores instantly.
- Click a spot to see the exact math, nearby demand and the nearest competitors, plus a plain-English explanation.
- Compare two spots: the model picks, the LLM explains the tradeoff.
- Search a place you know and download a one-page report for a landlord or lender.

## The decision model
- demand = Σ weight × count, for students, workers, residents and shoppers
- raw = demand / (1 + competition weight × competitors)
- score = percentile of raw among nearby areas (0 to 100)

The model is deterministic and runs in the browser. The server recomputes scores itself before calling the LLM. The LLM never picks a winner.

## Tracks
- **Local Businesses:** free site selection for independent owners, plus a printable owner report.
- **Best Use of Snowflake:** Overture Maps Places from the Snowflake Marketplace, H3 geospatial functions to build features per hexagon, Llama 3.3 70B through Cortex `AI_COMPLETE`, and CoCo for data exploration (below).
- **Best Open-Source AI:** Llama 3.3 70B (open weights, [Llama 3.3 Community License](https://www.llama.com/llama3_3/license/)) turns descriptions into model inputs and explains every result. MIT-licensed repo.

## How we used CoCo
<screenshots from docs/coco/ with one line each>

## Architecture
Overture places → Snowflake (`PLACES` → `HEX_FEATURES` with H3) → Next.js API → `lib/model.ts` scores in the browser → Llama via Cortex for plain-English input and explanations → Postgres cache.

Reliability: the app falls back to exported data if Snowflake is unreachable, retries dropped connections, rate-limits LLM routes, and caches every LLM result.

## Run locally
1. `npm install`
2. Create `.env.local` with the names in `instructions/02-setup.md`
3. `npm run dev` (set `MOCK_MODE=true` to run without Snowflake)

## Built with
Snowflake (Marketplace, H3, Cortex), CoCo, Llama 3.3 70B, Next.js, TypeScript, Tailwind CSS, shadcn/ui, deck.gl, MapLibre GL, react-map-gl, h3-js, lucide-react, sonner, Neon Postgres, Vercel.

## Data and attribution
Places: Overture Maps Foundation. Basemap: © CARTO, © OpenStreetMap contributors.

## License
MIT
```

## 6.4 Backup video (5:30)
Record the 3-minute demo with Cmd+Shift+5. Upload it (YouTube unlisted or Google Drive) and add the link to the README and OrgHQ.

## 6.5 Submit on OrgHQ by 6:20
1. Sign in with the account that filled out the team registration form.
2. Challenges → **Add Submission**.
3. Project name includes your team name. Add the live URL, GitHub URL, description (README "What it does"), technologies and the video link.
4. Under "Which challenge(s) are you submitting to?", select **Local Businesses**, **Best Use of Snowflake** and **Best Open-Source AI Project**.
5. **Submit Project.**
6. Your Submission → **Add Member** → send the invite link to each teammate.
