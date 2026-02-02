-- Migration: Deduplicate Persons by LinkedinUrl (Step 3)
-- This merges duplicate Person records that share the same LinkedinUrl
-- NOTE: This is a no-op for fresh databases (no duplicates to deduplicate)

DO $$
DECLARE
  dup_count INTEGER;
BEGIN
  -- Check if there are any duplicates
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT "LinkedinUrl"
    FROM "Persons"
    WHERE "LinkedinUrl" IS NOT NULL
    GROUP BY "LinkedinUrl"
    HAVING COUNT(*) > 1
  ) dups;

  IF dup_count = 0 THEN
    RAISE NOTICE 'No duplicate persons found - skipping deduplication';
    RETURN;
  END IF;

  RAISE NOTICE 'Found % LinkedinUrls with duplicate Person records', dup_count;

  -- Create a temp table to identify duplicates and their canonical PersonID
  CREATE TEMP TABLE person_dedup AS
  SELECT 
    "LinkedinUrl",
    MIN("PersonID") as canonical_person_id,
    ARRAY_AGG("PersonID" ORDER BY "PersonID") as all_person_ids
  FROM "Persons"
  WHERE "LinkedinUrl" IS NOT NULL
  GROUP BY "LinkedinUrl"
  HAVING COUNT(*) > 1;

-- Update all FK references to point to canonical PersonID
-- Order matters to avoid FK violations

-- 1. PersonProjects - Update references (may create duplicates, handle after)
UPDATE "PersonProjects" pp
SET "PersonID" = pd.canonical_person_id
FROM person_dedup pd
WHERE pp."PersonID" = ANY(pd.all_person_ids)
  AND pp."PersonID" != pd.canonical_person_id;

-- Delete FROM "PersonProjects" pp1
DELETE FROM "PersonProjects" pp1
USING "PersonProjects" pp2
WHERE pp1."PersonProjectID" > pp2."PersonProjectID"
  AND pp1."ProjectID" = pp2."ProjectID"
  AND pp1."PersonID" = pp2."PersonID";

-- 2. Documents
UPDATE "Documents" d
SET "PersonID" = pd.canonical_person_id
FROM person_dedup pd
WHERE d."PersonID" = ANY(pd.all_person_ids)
  AND d."PersonID" != pd.canonical_person_id;

-- 3-8: Skip tables that don't exist in fresh database
-- (ModuleRuns, PostItems, ContentChunks, Claims, LayerSnapshots, CommentItems)

-- Now delete non-canonical Person records
DELETE FROM "Persons" p
USING person_dedup pd
WHERE p."PersonID" = ANY(pd.all_person_ids)
  AND p."PersonID" != pd.canonical_person_id;

-- Clean up temp table
DROP TABLE IF EXISTS person_dedup;

-- Log completion
RAISE NOTICE 'Deduplication complete. Total persons remaining: %', (SELECT COUNT(*) FROM "Persons");
END $$;
