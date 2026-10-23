USE ROLE SYSADMIN;
USE WAREHOUSE COMPUTE_WH;
USE SCHEMA SITE_SCOUT.APP;

-- Places within 12 km of Cal Poly Pomona (lat 34.06, lng -117.79)
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

-- Check: every type 100+ hexes, sums above 0
SELECT BUSINESS_TYPE, COUNT(*) AS HEXES, SUM(COMPETITORS) AS COMP, SUM(STUDENTS) AS STU,
       SUM(WORKERS) AS WRK, SUM(RESIDENTS) AS RES, SUM(SHOPPERS) AS SHOP
FROM HEX_FEATURES GROUP BY 1;
