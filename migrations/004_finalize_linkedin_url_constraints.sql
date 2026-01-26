-- Migration: Finalize LinkedinUrl constraints (Step 4)
-- Run AFTER backfill and deduplication are verified complete

-- First verify no duplicates remain
DO $$
DECLARE
  dup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT "LinkedinUrl"
    FROM "Persons"
    WHERE "LinkedinUrl" IS NOT NULL
    GROUP BY "LinkedinUrl"
    HAVING COUNT(*) > 1
  ) dups;
  
  IF dup_count > 0 THEN
    RAISE EXCEPTION 'Cannot add unique constraint: % duplicate LinkedinUrls still exist', dup_count;
  END IF;
END $$;

-- Drop the temporary index
DROP INDEX IF EXISTS "IDX_PERSON_LINKEDIN_URL_TEMP";

-- Add the unique index
CREATE UNIQUE INDEX IF NOT EXISTS "IDX_PERSON_LINKEDIN_URL" ON "Persons" ("LinkedinUrl");

-- Note: We keep LinkedinUrl nullable for now to support edge cases where 
-- Person was created without a LinkedIn URL. New persons require it via application logic.
-- To make it NOT NULL, uncomment the following after verifying all persons have URLs:
-- 
-- ALTER TABLE "Persons" ALTER COLUMN "LinkedinUrl" SET NOT NULL;

-- Report final state
DO $$
DECLARE
  total_count INTEGER;
  with_url INTEGER;
  without_url INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM "Persons";
  SELECT COUNT(*) INTO with_url FROM "Persons" WHERE "LinkedinUrl" IS NOT NULL;
  SELECT COUNT(*) INTO without_url FROM "Persons" WHERE "LinkedinUrl" IS NULL;
  RAISE NOTICE 'Migration complete: % total persons, % with LinkedinUrl, % without', total_count, with_url, without_url;
END $$;
