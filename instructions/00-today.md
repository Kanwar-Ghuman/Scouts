# 00. Today: Bronco MiniHacks runbook

Hacking 11:00 AM to 6:30 PM. Submit on OrgHQ by **6:20**. Demos 6:40 PM.
Tracks: **Local Businesses**, **Best Use of Snowflake**, **Best Open-Source AI Project**.
Line: **The LLM generates. The model decides. The LLM explains.**

## Do right now
- [ ] **Team Registration Google Form by 12:30 PM.** The same account submits on OrgHQ later.
- [ ] Start a **brand-new repo**. Don't copy code from earlier builds. Judges check commit history.

---

## A. Setup commands (11:30, about 15 min)

**1. Create the app**
```bash
cd ~/Desktop
npx --yes create-next-app@latest site-scout-mh --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --yes
cd site-scout-mh
npm i snowflake-sdk @neondatabase/serverless h3-js maplibre-gl react-map-gl @deck.gl/react @deck.gl/core @deck.gl/layers @deck.gl/geo-layers
npx --yes shadcn@latest init -y -d
npx --yes shadcn@latest add -y card select badge skeleton button separator popover tooltip scroll-area slider textarea command dialog sonner
```

**2. Instructions + Cursor rules** (adjust the source paths to where you saved the new files)
```bash
mkdir -p instructions .cursor/rules data docs/coco db sql scripts
cp ~/Downloads/0*-*.md instructions/
cp ~/Downloads/site-scout.mdc .cursor/rules/
printf "data/*.json\n.env*\n*.p8\n" > .cursorignore
echo "*.p8" >> .gitignore
ls instructions .cursor/rules
```

**3. Env file**
```bash
cat > .env.local <<EOF
SNOWFLAKE_ACCOUNT=MPIXLRP-SC11436
SNOWFLAKE_USER=SITE_SCOUT_APP
SNOWFLAKE_ROLE=SYSADMIN
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_DATABASE=SITE_SCOUT
SNOWFLAKE_SCHEMA=APP
SNOWFLAKE_PRIVATE_KEY_B64=$(base64 -i ~/.snowflake/rsa_key.p8 | tr -d '\n')
DATABASE_URL=
MOCK_MODE=false
EOF
grep -c "=" .env.local
```
Paste your Neon connection string into `DATABASE_URL` if you have one (optional).

**4. GitHub + Vercel**
```bash
git add -A && git commit -m "[setup] scaffold"
gh repo create site-scout-mh --public --source=. --push   # or create on github.com and push
npm i -g vercel && vercel link
```

**5. Open in Cursor.** File → Open Folder → `site-scout-mh`. Settings → Rules: `site-scout` shows **Always**. Then run `npm run dev` in Cursor's terminal.

---

## B. Data in Snowflake (11:45, about 15 min)
Use CoCo for this. The Snowflake track requires it, so screenshot each session into `docs/coco/`.
1. `cortex`, pick `site_scout`, ask: "Describe OVERTURE_MAPS_PLACES.CARTO.PLACE and show 10 places near lat 34.06, lng -117.79 with name and BASIC_CATEGORY."
2. Run the full script in `03-data.md` step 3.2 in Snowsight (Cmd+Shift+Enter). Save it as `sql/setup.sql`.
3. Ask CoCo: "Summarize HEX_FEATURES by BUSINESS_TYPE with counts and sums." Screenshot.
4. Export the offline fallback (`03-data.md` 3.4).
5. Commit: `[data] snowflake setup + offline export`.

---

## C. Build (Cursor Agent: new chat per prompt, Accept all, check browser, commit)

| Start | Prompt | Goal |
|---|---|---|
| 12:00 | 0 | Connections + health |
| 12:15 | 1 | Model + data layer |
| 12:45 | 2 | Map + sliders |
| 1:00 | | **Lunch** (keep it to 30 min) |
| 1:30 | 3 | LLM generates weights |
| 2:00 | 4 | Hex panel + verdict + Top spots |
| 2:45 | 5 | Compare |
| 3:15 | 6 | Place search + owner report |
| 3:45 | 7 | Robustness + URL state + mobile |
| 4:15 | 8 | Polish pass |
| 4:45 | | Deploy (06) |
| 5:00 | | **Dinner** + pre-warm + README |
| 6:00 | | Rehearse, submit by 6:20 |

**Prompt 0: connections + health**
```
@instructions/01-overview.md @instructions/02-setup.md
Do steps 2.1 (only next.config.ts and LICENSE, packages are installed), 2.3, 2.4 and 2.5 exactly. Include the retry logic in 2.3.
```
Done when: `localhost:3000/api/health` shows a Llama reply. Commit `[setup] connections + health`.

**Prompt 1: model + data layer**
```
@instructions/01-overview.md @instructions/03-data.md @instructions/04-api.md
Do steps 4.1, 4.2 and 4.3. lib/model.ts must match 4.2 exactly. Create lib/queries.ts from 03-data.md 3.3.
Then run npx tsc --noEmit and fix errors.
```
Done when: `/api/hexes?type=boba` returns `source: "live"` with hexes. Commit `[model] decision model + data routes`.

**Prompt 2: map + sliders**
```
@instructions/01-overview.md @instructions/05-ui.md
Do steps 5.1, 5.2, 5.3 and 5.4. Follow the design system exactly. URL state comes later.
```
Done when: colored map, type chips, sliders recolor live. Commit `[ui] map + priorities`.

**Prompt 3: LLM generates weights**
```
@instructions/01-overview.md @instructions/04-api.md @instructions/05-ui.md
Do step 4.4, then 4.7 (/api/plan) and 5.4b (IntentBox).
```
Done when: the laundromat example moves sliders and recolors the map. Commit `[ai] intent to weights`.

**Prompt 4: hex panel + verdict + Top spots**
```
@instructions/01-overview.md @instructions/04-api.md @instructions/05-ui.md
Do step 4.5 (/api/verdict), then 5.5 (HexPanel) and 5.6 (Top spots + fly-to).
```
Done when: Top spot #1 shows the math, competitor dots and an AI explanation; second click is instant. Commit `[ui] hex panel + verdict`.

**Prompt 5: compare**
```
@instructions/01-overview.md @instructions/04-api.md @instructions/05-ui.md
Do step 4.6 (/api/compare) and 5.7 (ComparePanel).
```
Done when: winner, table and explanation show; a slider can flip the winner. Commit `[ui] compare`.

**Prompt 6: place search + owner report**
```
@instructions/01-overview.md @instructions/04-api.md @instructions/05-ui.md
Do step 4.8 (/api/search), 5.9 (PlaceSearch) and 5.10 (/report page).
```
Done when: searching "Cal Poly" flies there; "Download report" opens a clean printable page. Commit `[ui] search + report`.

**Prompt 7: robustness**
```
@instructions/01-overview.md @instructions/04-api.md @instructions/05-ui.md
Do step 4.9 (rate limiting + input validation), 5.2 URL state, 5.11 (error boundary + status badge) and 5.12 (mobile layout).
```
Done when: URL reopens the same view, killing Wi-Fi shows "Offline data" and the map still works. Commit `[app] robustness`.

**Prompt 8: polish**
```
@instructions/05-ui.md
Go through the 5.8 polish checklist and the "More polish checks" list at the end item by item. Fix anything that fails. Don't add features.
```

---

## D. Fixes
| Problem | Fix |
|---|---|
| JWT invalid | `SNOWFLAKE_USER=SITE_SCOUT_APP`, key has no line breaks |
| Insufficient privileges on schema | As ACCOUNTADMIN: `GRANT OWNERSHIP ON SCHEMA SITE_SCOUT.APP TO ROLE SYSADMIN COPY CURRENT GRANTS;` |
| Map blank | `ssr: false`, maplibre CSS imported, container has full height |
| Wi-Fi blocks Snowflake | Hotspot. The app also falls back to `data/` automatically |
| Cursor loops | Stop, `git checkout -- <file>`, re-prompt with the step number and the error |
| Vercel build fails on snowflake-sdk | Check `serverExternalPackages` and `runtime = "nodejs"` on every route |
