-- Migration: Deduplicate Persons by LinkedinUrl (Step 3)
-- This merges duplicate Person records that share the same LinkedinUrl
-- IMPORTANT: Run this in a transaction and review before committing

BEGIN;

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

-- Log duplicates found
DO $$
DECLARE
  dup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dup_count FROM person_dedup;
  RAISE NOTICE 'Found % LinkedinUrls with duplicate Person records', dup_count;
END $$;

-- Update all FK references to point to canonical PersonID
-- Order matters to avoid FK violations

-- 1. PersonProjects - Update references (may create duplicates, handle after)
UPDATE "PersonProjects" pp
SET "PersonID" = pd.canonical_person_id
FROM person_dedup pd
WHERE pp."PersonID" = ANY(pd.all_person_ids)
  AND pp."PersonID" != pd.canonical_person_id;

-- 1b. Remove duplicate PersonProjects (same project+person after merge)
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

-- 3. ModuleRuns
UPDATE "ModuleRuns" mr
SET "PersonID" = pd.canonical_person_id
FROM person_dedup pd
WHERE mr."PersonID" = ANY(pd.all_person_ids)
  AND mr."PersonID" != pd.canonical_person_id;

-- 4. PostItems
UPDATE "PostItems" pi
SET "PersonID" = pd.canonical_person_id
FROM person_dedup pd
WHERE pi."PersonID" = ANY(pd.all_person_ids)
  AND pi."PersonID" != pd.canonical_person_id;

-- 5. ContentChunks
UPDATE "ContentChunks" cc
SET "PersonID" = pd.canonical_person_id
FROM person_dedup pd
WHERE cc."PersonID" = ANY(pd.all_person_ids)
  AND cc."PersonID" != pd.canonical_person_id;

-- 6. Claims
UPDATE "Claims" c
SET "PersonID" = pd.canonical_person_id
FROM person_dedup pd
WHERE c."PersonID" = ANY(pd.all_person_ids)
  AND c."PersonID" != pd.canonical_person_id;

-- 7. LayerSnapshots
UPDATE "LayerSnapshots" ls
SET "PersonID" = pd.canonical_person_id
FROM person_dedup pd
WHERE ls."PersonID" = ANY(pd.all_person_ids)
  AND ls."PersonID" != pd.canonical_person_id;

-- 8. CommentItems (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'CommentItems') THEN
    EXECUTE '
      UPDATE "CommentItems" ci
      SET "PersonID" = pd.canonical_person_id
      FROM person_dedup pd
      WHERE ci."PersonID" = ANY(pd.all_person_ids)
        AND ci."PersonID" != pd.canonical_person_id
    ';
  END IF;
END $$;

-- Now delete non-canonical Person records
DELETE FROM "Persons" p
USING person_dedup pd
WHERE p."PersonID" = ANY(pd.all_person_ids)
  AND p."PersonID" != pd.canonical_person_id;

-- Clean up temp table
DROP TABLE person_dedup;

-- Log completion
DO $$
DECLARE
  person_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO person_count FROM "Persons";
  RAISE NOTICE 'Deduplication complete. Total persons remaining: %', person_count;
END $$;

COMMIT;
