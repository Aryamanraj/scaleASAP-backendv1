-- Migration: Backfill LinkedinUrl from Documents table (Step 2)
-- This populates LinkedinUrl by finding the latest valid linkedin_profile document for each Person

-- Backfill LinkedinUrl from the latest valid LINKEDIN_PROFILE document per Person
UPDATE "Persons" p
SET "LinkedinUrl" = LOWER(TRIM(TRAILING '/' FROM subq.profile_url))
FROM (
  SELECT DISTINCT ON (d."PersonID")
    d."PersonID",
    -- Extract profile_url from PayloadJson (handles different JSON structures)
    COALESCE(
      d."PayloadJson"->'basic_info'->>'profile_url',
      d."PayloadJson"->>'profile_url',
      d."PayloadJson"->'profile'->>'url',
      d."PayloadJson"->>'url'
    ) as profile_url
  FROM "Documents" d
  WHERE d."Source" = 'LINKEDIN'
    AND d."DocumentKind" = 'linkedin_profile'
    AND d."IsValid" = true
    AND (
      d."PayloadJson"->'basic_info'->>'profile_url' IS NOT NULL
      OR d."PayloadJson"->>'profile_url' IS NOT NULL
      OR d."PayloadJson"->'profile'->>'url' IS NOT NULL
      OR d."PayloadJson"->>'url' IS NOT NULL
    )
  ORDER BY d."PersonID", d."CapturedAt" DESC
) subq
WHERE p."PersonID" = subq."PersonID"
  AND p."LinkedinUrl" IS NULL
  AND subq.profile_url IS NOT NULL
  AND subq.profile_url != '';

-- Report how many were backfilled
DO $$
DECLARE
  filled_count INTEGER;
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO filled_count FROM "Persons" WHERE "LinkedinUrl" IS NOT NULL;
  SELECT COUNT(*) INTO null_count FROM "Persons" WHERE "LinkedinUrl" IS NULL;
  RAISE NOTICE 'Backfill complete: % persons have LinkedinUrl, % still NULL', filled_count, null_count;
END $$;
