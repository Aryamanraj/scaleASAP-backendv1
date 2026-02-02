-- Migration: Backfill LinkedinUrl from Documents table (Step 2)
-- This populates LinkedinUrl by finding the latest valid linkedin_profile document for each Person
-- NOTE: This is a no-op for fresh databases (no existing data to backfill)

-- For fresh installations with no existing data, this migration does nothing
-- For databases migrated from older schemas, this would backfill LinkedinUrl from Documents

DO $$
BEGIN
  -- Check if we're on a fresh database (no persons exist yet)
  IF (SELECT COUNT(*) FROM "Persons") = 0 THEN
    RAISE NOTICE 'Fresh database detected - no backfill needed';
  ELSE
    -- Backfill LinkedinUrl from the latest valid document per Person
    -- Use ContentJson (new schema) instead of PayloadJson (old schema)
    UPDATE "Persons" p
    SET "LinkedinUrl" = LOWER(TRIM(TRAILING '/' FROM subq.profile_url))
    FROM (
      SELECT DISTINCT ON (d."PersonID")
        d."PersonID",
        -- Extract profile_url from ContentJson
        COALESCE(
          d."ContentJson"->'basic_info'->>'profile_url',
          d."ContentJson"->>'profile_url',
          d."ContentJson"->'profile'->>'url',
          d."ContentJson"->>'url'
        ) as profile_url
      FROM "Documents" d
      WHERE d."Source" = 'LINKEDIN'
        AND d."DocumentKind" = 'linkedin_profile'
        AND d."IsValid" = true
        AND (
          d."ContentJson"->'basic_info'->>'profile_url' IS NOT NULL
          OR d."ContentJson"->>'profile_url' IS NOT NULL
          OR d."ContentJson"->'profile'->>'url' IS NOT NULL
          OR d."ContentJson"->>'url' IS NOT NULL
        )
      ORDER BY d."PersonID", d."CreatedAt" DESC
    ) subq
    WHERE p."PersonID" = subq."PersonID"
      AND p."LinkedinUrl" IS NULL
      AND subq.profile_url IS NOT NULL
      AND subq.profile_url != '';

    RAISE NOTICE 'Backfill complete: % persons have LinkedinUrl, % still NULL', 
      (SELECT COUNT(*) FROM "Persons" WHERE "LinkedinUrl" IS NOT NULL),
      (SELECT COUNT(*) FROM "Persons" WHERE "LinkedinUrl" IS NULL);
  END IF;
END $$;
