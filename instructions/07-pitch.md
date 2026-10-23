# 07. Pitch (Bronco MiniHacks)

**Line to repeat:** The LLM generates. The model decides. The LLM explains.
**Short version for anyone:** "Zillow, but for where to open a small business."

Judging (Local Businesses): impact, functionality, UX, technical complexity, presentation (5 each), creativity (3). The script below hits each one.

## Prep (5:45 to 6:15)
1. **Flip pair:** with boba defaults, find two spots where dragging "Avoid competition" from 0.5 to 3 flips the winner (A: more demand, 2 to 4 competitors. B: less demand, 0 competitors). Save that compare URL.
2. **Cache the demo:** click through every step below once on the live site.
3. **Tabs:** live app (fresh, boba defaults), the saved compare URL, README, backup video.
4. **Wake the warehouse:** load the site 10 minutes before your slot.
5. Zoom the browser to 110 to 125% so the room can read it.

## 3-minute demo

**Problem (20s) → Impact**
> "Picking a location is the biggest bet a small business makes, and most owners make it on a hunch. Chains pay consultants and data teams for this. Site Scout gives an independent owner the same kind of answer, for free."

**LLM generates (30s) → Creativity**
*Click the example "Laundromat for apartment renters."*
> "You describe your business in plain English. An open-weight model, Llama 3.3, turns that into settings for our decision model. Watch the sliders move. The AI doesn't pick a spot. It only writes the inputs."

**Model decides (35s) → Technical complexity**
*Map recolors. Click Top spot #1.*
> "Snowflake turned open data from its Marketplace into features for every hexagon using its H3 geospatial functions. Our decision model scores each one in the browser. Same inputs, same answer, every time. And here's the exact math. No black box."
*Point at "Why this score," the competitor dots, then the AI explanation.*

**Owner control (20s) → UX**
*Drag Residents to 0.*
> "Every owner knows their customers. Change what matters and the whole map rescores instantly."

**The decision (35s) → Functionality**
*Open the saved compare URL.*
> "The real question is usually this spot or that one. The model picks A. The LLM explains the tradeoff and when B would be better."
*Drag "Avoid competition" to 3. Winner flips.*
> "Care more about competition, and the decision flips."

**For the owner (20s) → Impact**
*Click "Download report."*
> "An owner can take this one-page report to a landlord, a bank or the SBA."

**Close (20s)**
> "Open data from the Snowflake Marketplace, CoCo to explore it, an open-weight model, and a decision model owners can see and tune. It still works offline if the connection drops. The LLM generates. The model decides. The LLM explains."

## Judge questions
- **Why not let the LLM decide?** Ask an LLM twice, get two answers, and it can invent numbers. The model is consistent and auditable. The LLM does what it's good at: understanding people and explaining.
- **Is the score a chance of success?** No. It's a percentile. 90 means better than 90% of nearby areas under your priorities. The report says so too.
- **Where's the data from?** Overture Maps places, a free Snowflake Marketplace listing. We filtered 12 km around Pomona and counted places per H3 hexagon in Snowflake.
- **How did you use CoCo?** To explore the Overture schema, find the category column and check the features table. Screenshots are in the README.
- **What if the AI returns garbage?** Its output is validated and clamped to 0 to 3. If it fails, a keyword fallback picks the type with default weights. If Snowflake is down, the app serves exported data.
- **What's missing?** Rent, real foot traffic, demographics and zoning. Census demographics are on the Snowflake Marketplace and would be a new demand group in the same model.
- **How does it scale?** Snowflake computes features once. Scoring is a few thousand multiplications in the browser. A new city is a new bounding box and one SQL rerun.
- **Who pays?** Free for owners. Cities, small business development centers and commercial landlords could fund it to fill empty storefronts.
