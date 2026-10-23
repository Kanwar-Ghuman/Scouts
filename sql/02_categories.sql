USE ROLE SYSADMIN;
USE WAREHOUSE COMPUTE_WH;
USE SCHEMA SITE_SCOUT.APP;

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
