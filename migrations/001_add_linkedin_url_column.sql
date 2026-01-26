-- Migration: Add LinkedinUrl to Persons table (Step 1 - Add nullable column)
-- Run this first before backfill

-- Add LinkedinUrl column as nullable initially
ALTER TABLE "Persons" 
ADD COLUMN IF NOT EXISTS "LinkedinUrl" VARCHAR(512) NULL;

-- Add index for lookups (but not unique yet, since we need to backfill and dedupe first)
CREATE INDEX IF NOT EXISTS "IDX_PERSON_LINKEDIN_URL_TEMP" ON "Persons" ("LinkedinUrl");

-- Add unique constraint to PersonProjects (Project + Person combination)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'UQ_PERSON_PROJECT'
  ) THEN
    ALTER TABLE "PersonProjects" 
    ADD CONSTRAINT "UQ_PERSON_PROJECT" UNIQUE ("ProjectID", "PersonID");
  END IF;
END $$;
