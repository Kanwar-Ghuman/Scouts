# 03. Data (Snowflake)

Goal: count, per hexagon, the competitors for each business type and the demand drivers in each group. Scoring happens in `lib/model.ts`.

Known facts about this account:
- Overture table: `OVERTURE_MAPS_PLACES.CARTO.PLACE`
- Category column: `BASIC_CATEGORY` (TEXT). There is no `CATEGORIES` column.
- Name: `NAMES:primary`. Point: `GEOMETRY` (GEOGRAPHY).
- Objects must be owned by SYSADMIN.

## 3.1 Explore with CoCo (screenshots for the README)
`cortex` → `site_scout`, then ask:
1. "Describe OVERTURE_MAPS_PLACES.CARTO.PLACE and show 10 places near lat 34.06, lng -117.79 with name and BASIC_CATEGORY."
2. "List the 60 most common BASIC_CATEGORY values within 12 km of that point."
Save screenshots to `docs/coco/`.

## 3.2 Full setup script: `sql/setup.sql`
Paste into a Snowsight worksheet and run all (Cmd+Shift+Enter).
```sql
USE ROLE SYSADMIN;
USE WAREHOUSE COMPUTE_WH;
USE SCHEMA SITE_SCOUT.APP;

-- PART 1: places in the demo area
CREATE OR REPLACE TABLE PLACES AS
SELECT
  p.ID                                   AS PLACE_ID,
  p.NAMES:primary::STRING                AS NAME,
  p.BASIC_CATEGORY                       AS CATEGORY,
  ST_Y(p.GEOMETRY)                       AS LAT,
  ST_X(p.GEOMETRY)                       AS LNG,
  p.GEOMETRY                             AS GEOG,
  H3_POINT_TO_CELL_STRING(p.GEOMETRY, 8) AS H3
FROM OVERTURE_MAPS_PLACES.CARTO.PLACE p
WHERE ST_X(p.GEOMETRY) BETWEEN -117.94 AND -117.64
  AND ST_Y(p.GEOMETRY) BETWEEN 33.95 AND 34.17
  AND ST_DWITHIN(p.GEOMETRY, ST_MAKEPOINT(-117.79, 34.06), 12000)
  AND p.BASIC_CATEGORY IS NOT NULL;

-- PART 2: categories, matched by pattern
CREATE OR REPLACE TABLE DRIVER_CATEGORIES AS
SELECT CATEGORY, DRIVER_GROUP FROM (
  SELECT DISTINCT CATEGORY,
    CASE
      WHEN CATEGORY ILIKE ANY ('%college%', '%university%', '%high_school%', '%school%') THEN 'students'
      WHEN CATEGORY ILIKE ANY ('%office%', '%hospital%', '%bank%', '%coworking%', '%clinic%', '%corporate%') THEN 'workers'
      WHEN CATEGORY ILIKE ANY ('%apartment%', '%residential%', '%grocery%', '%supermarket%', '%convenience%') THEN 'residents'
      WHEN CATEGORY ILIKE ANY ('%shopping%', '%mall%', '%department_store%', '%pharmacy%', '%retail%') THEN 'shoppers'
    END AS DRIVER_GROUP
  FROM PLACES
) WHERE DRIVER_GROUP IS NOT NULL;

CREATE OR REPLACE TABLE COMPETITOR_CATEGORIES AS
SELECT DISTINCT b.BUSINESS_TYPE, p.CATEGORY
FROM (SELECT DISTINCT CATEGORY FROM PLACES) p
JOIN (VALUES
  ('boba', '%bubble%'), ('boba', '%coffee%'), ('boba', '%cafe%'), ('boba', '%tea_room%'), ('boba', '%tea_house%'),
  ('barber', '%barber%'), ('barber', '%hair%'), ('barber', '%salon%'),
  ('laundromat', '%laundr%'), ('laundromat', '%dry_clean%'),
  ('gym', '%gym%'), ('gym', '%fitness%'), ('gym', '%yoga%'), ('gym', '%pilates%'),
  ('taco', '%fast_food%'), ('taco', '%mexican%'), ('taco', '%taco%'), ('taco', '%burrito%')
) AS b(BUSINESS_TYPE, PAT)
  ON p.CATEGORY ILIKE b.PAT;

-- PART 3: features per hex
CREATE OR REPLACE TABLE HEX_FEATURES AS
WITH drivers AS (
  SELECT p.H3,
    COUNT_IF(d.DRIVER_GROUP = 'students')  AS STUDENTS,
    COUNT_IF(d.DRIVER_GROUP = 'workers')   AS WORKERS,
    COUNT_IF(d.DRIVER_GROUP = 'residents') AS RESIDENTS,
    COUNT_IF(d.DRIVER_GROUP = 'shoppers')  AS SHOPPERS
  FROM PLACES p JOIN DRIVER_CATEGORIES d ON p.CATEGORY = d.CATEGORY
  GROUP BY p.H3
),
comps AS (
  SELECT c.BUSINESS_TYPE, p.H3, COUNT(*) AS COMPETITORS
  FROM PLACES p JOIN COMPETITOR_CATEGORIES c ON p.CATEGORY = c.CATEGORY
  GROUP BY c.BUSINESS_TYPE, p.H3
),
types AS (SELECT DISTINCT BUSINESS_TYPE FROM COMPETITOR_CATEGORIES),
cells AS (SELECT H3 FROM drivers UNION SELECT H3 FROM comps)
SELECT t.BUSINESS_TYPE, c.H3,
  COALESCE(k.COMPETITORS, 0) AS COMPETITORS,
  COALESCE(d.STUDENTS, 0)    AS STUDENTS,
  COALESCE(d.WORKERS, 0)     AS WORKERS,
  COALESCE(d.RESIDENTS, 0)   AS RESIDENTS,
  COALESCE(d.SHOPPERS, 0)    AS SHOPPERS,
  ST_Y(H3_CELL_TO_POINT(H3_STRING_TO_INT(c.H3))) AS LAT,
  ST_X(H3_CELL_TO_POINT(H3_STRING_TO_INT(c.H3))) AS LNG
FROM types t CROSS JOIN cells c
LEFT JOIN drivers d ON d.H3 = c.H3
LEFT JOIN comps k   ON k.H3 = c.H3 AND k.BUSINESS_TYPE = t.BUSINESS_TYPE;

-- CHECK: every type 100+ hexes, sums above 0
SELECT BUSINESS_TYPE, COUNT(*) AS HEXES, SUM(COMPETITORS) AS COMP, SUM(STUDENTS) AS STU,
       SUM(WORKERS) AS WRK, SUM(RESIDENTS) AS RES, SUM(SHOPPERS) AS SHOP
FROM HEX_FEATURES GROUP BY 1;
```

## 3.3 App queries: `lib/queries.ts`
```ts
// SQL the app runs per request. Connection already uses SITE_SCOUT.APP.
// Bind order and returned columns above each query. Columns come back UPPERCASE.
// H3 ids are strings; wrap them with H3_STRING_TO_INT before H3 geo functions.

// binds: [type] -> H3, COMPETITORS, STUDENTS, WORKERS, RESIDENTS, SHOPPERS, LAT, LNG
export const HEXES_SQL = `
SELECT H3, COMPETITORS, STUDENTS, WORKERS, RESIDENTS, SHOPPERS, LAT, LNG
FROM HEX_FEATURES
WHERE BUSINESS_TYPE = ?`;

// binds: [type, h3] -> one row, same columns
export const HEX_SQL = `
SELECT H3, COMPETITORS, STUDENTS, WORKERS, RESIDENTS, SHOPPERS, LAT, LNG
FROM HEX_FEATURES
WHERE BUSINESS_TYPE = ? AND H3 = ?`;

// binds: [h3, type] -> NAME, CATEGORY, LAT, LNG, DISTANCE_M
export const COMPETITORS_SQL = `
SELECT p.NAME, p.CATEGORY, p.LAT, p.LNG,
       ROUND(ST_DISTANCE(p.GEOG, H3_CELL_TO_POINT(H3_STRING_TO_INT(?)))) AS DISTANCE_M
FROM PLACES p
JOIN COMPETITOR_CATEGORIES c ON p.CATEGORY = c.CATEGORY
WHERE c.BUSINESS_TYPE = ? AND p.NAME IS NOT NULL
ORDER BY DISTANCE_M
LIMIT 5`;

// binds: [h3] -> CATEGORY, DRIVER_GROUP, N
export const DRIVERS_SQL = `
SELECT p.CATEGORY, d.DRIVER_GROUP, COUNT(*) AS N
FROM PLACES p
JOIN DRIVER_CATEGORIES d ON p.CATEGORY = d.CATEGORY
WHERE p.H3 = ?
GROUP BY p.CATEGORY, d.DRIVER_GROUP
ORDER BY N DESC
LIMIT 8`;

// binds: ["%query%", "query%"] -> NAME, CATEGORY, LAT, LNG, H3
export const SEARCH_SQL = `
SELECT NAME, CATEGORY, LAT, LNG, H3
FROM PLACES
WHERE NAME ILIKE ?
ORDER BY IFF(NAME ILIKE ?, 0, 1), LENGTH(NAME)
LIMIT 8`;
```

## 3.4 Offline fallback export
The app uses these files automatically if Snowflake is unreachable.
```bash
for t in boba barber laundromat gym taco; do
  snow sql -c site_scout --format json -q "SELECT H3, COMPETITORS, STUDENTS, WORKERS, RESIDENTS, SHOPPERS, LAT, LNG FROM SITE_SCOUT.APP.HEX_FEATURES WHERE BUSINESS_TYPE='$t'" > data/hexes-$t.json
  echo "$t: $(wc -c < data/hexes-$t.json) bytes"
done
```
If `snow` fails, ask CoCo: "Run this query for each business type and save the results as JSON to data/hexes-<type>.json in this folder."

Commit the JSON files. They're public Overture data, and they make the demo safe.

## 3.5 Keep the warehouse awake
```sql
USE ROLE ACCOUNTADMIN;
ALTER WAREHOUSE COMPUTE_WH SET AUTO_SUSPEND = 600;
```
