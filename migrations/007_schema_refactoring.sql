-- Migration: 007_schema_refactoring.sql
-- Description: Major schema refactoring:
--   A) Rename Companies table to Clients
--   B) Create new Locations and Organizations tables
--   C) Update Persons table with new fields and FKs
--   D) Update Users and Projects to reference ClientID instead of CompanyID
-- Date: 2024
-- 
-- ⚠️  IMPORTANT: Run this migration in a transaction and test on staging first!
-- This migration involves table renames and structural changes.

BEGIN;

-- =============================================================================
-- STEP 1: Create new enums
-- =============================================================================

-- CompanySizeRange enum for Organization employee counts
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CompanySizeRange') THEN
    CREATE TYPE "CompanySizeRange" AS ENUM (
      'SIZE_1_10',
      'SIZE_11_50',
      'SIZE_51_200',
      'SIZE_201_500',
      'SIZE_501_1000',
      'SIZE_1001_5000',
      'SIZE_5001_10000',
      'SIZE_10001_PLUS'
    );
  END IF;
END $$;

-- CompanyType enum for Organization classification
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CompanyType') THEN
    CREATE TYPE "CompanyType" AS ENUM (
      'PUBLIC',
      'PRIVATE',
      'NONPROFIT',
      'GOVERNMENT',
      'EDUCATIONAL',
      'SELF_EMPLOYED',
      'PARTNERSHIP',
      'OTHER'
    );
  END IF;
END $$;

-- =============================================================================
-- STEP 2: Create new Locations table
-- =============================================================================

CREATE TABLE IF NOT EXISTS "Locations" (
  "LocationID" SERIAL PRIMARY KEY,
  "Country" VARCHAR(128),
  "CountryCode" VARCHAR(8),
  "City" VARCHAR(128),
  "Region" VARCHAR(128),
  "DisplayName" VARCHAR(512),
  "NormalizedKey" VARCHAR(512) NOT NULL UNIQUE,
  "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "UpdatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Locations
CREATE UNIQUE INDEX IF NOT EXISTS "IDX_LOCATION_NORMALIZED_KEY" ON "Locations" ("NormalizedKey");
CREATE INDEX IF NOT EXISTS "IDX_LOCATION_COUNTRY_CODE" ON "Locations" ("CountryCode");

-- =============================================================================
-- STEP 3: Create new Organizations table (prospect/employer companies)
-- =============================================================================

CREATE TABLE IF NOT EXISTS "Organizations" (
  "OrganizationID" SERIAL PRIMARY KEY,
  "Name" VARCHAR(512) NOT NULL,
  "NameNormalized" VARCHAR(512),
  "Domain" VARCHAR(255),
  "Website" VARCHAR(512),
  "LinkedinUrl" VARCHAR(512),
  "LinkedinCompanyId" VARCHAR(64),
  "LinkedinCompanyUrn" VARCHAR(128),
  "Industry" VARCHAR(255),
  "SizeRange" "CompanySizeRange",
  "FoundedYear" INTEGER,
  "Type" "CompanyType",
  "InferredRevenue" VARCHAR(128),
  "TotalFundingRaised" VARCHAR(128),
  "LocationID" BIGINT REFERENCES "Locations"("LocationID"),
  "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "UpdatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Organizations (dedupe indexes)
CREATE UNIQUE INDEX IF NOT EXISTS "IDX_ORG_LINKEDIN_COMPANY_URN" 
  ON "Organizations" ("LinkedinCompanyUrn") 
  WHERE "LinkedinCompanyUrn" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "IDX_ORG_LINKEDIN_COMPANY_ID" 
  ON "Organizations" ("LinkedinCompanyId");

CREATE UNIQUE INDEX IF NOT EXISTS "IDX_ORG_DOMAIN" 
  ON "Organizations" ("Domain") 
  WHERE "Domain" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "IDX_ORG_NAME_NORMALIZED" 
  ON "Organizations" ("NameNormalized");

CREATE INDEX IF NOT EXISTS "IDX_ORG_LOCATION" 
  ON "Organizations" ("LocationID");

-- =============================================================================
-- STEP 4: Rename Companies table to Clients (or create if doesn't exist)
-- =============================================================================

-- If Companies exists, rename it; otherwise create Clients fresh
DO $$
DECLARE
  v_table_exists BOOLEAN;
  v_constraint_exists BOOLEAN;
BEGIN
  -- Check if Companies table exists (using pg_tables which handles case properly)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'Companies') THEN
    -- Rename the table
    ALTER TABLE "Companies" RENAME TO "Clients";
    
    -- Rename primary key column
    ALTER TABLE "Clients" RENAME COLUMN "CompanyID" TO "ClientID";
    
    -- Rename sequence if auto-generated
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Companies_CompanyID_seq') THEN
      ALTER SEQUENCE "Companies_CompanyID_seq" RENAME TO "Clients_ClientID_seq";
    END IF;
    
    -- Update primary key constraint name if it exists
    -- Use a safer check that doesn't fail if table doesn't exist
    SELECT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE c.conname = 'Companies_pkey' AND t.relname = 'Clients'
    ) INTO v_constraint_exists;
    
    IF v_constraint_exists THEN
      ALTER TABLE "Clients" RENAME CONSTRAINT "Companies_pkey" TO "Clients_pkey";
    END IF;
    
    RAISE NOTICE 'Renamed Companies table to Clients';
  ELSIF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'Clients') THEN
    -- Create Clients table fresh
    CREATE TABLE "Clients" (
      "ClientID" SERIAL PRIMARY KEY,
      "Name" VARCHAR(255) NOT NULL,
      "Slug" VARCHAR(64) UNIQUE,
      "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    RAISE NOTICE 'Created new Clients table';
  ELSE
    RAISE NOTICE 'Clients table already exists, skipping';
  END IF;
END $$;

-- =============================================================================
-- STEP 5: Update Users table - CompanyID -> ClientID
-- =============================================================================

-- Rename the foreign key column (if it exists as CompanyID)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Users' AND column_name = 'CompanyID'
  ) THEN
    ALTER TABLE "Users" RENAME COLUMN "CompanyID" TO "ClientID";
    RAISE NOTICE 'Renamed Users.CompanyID to ClientID';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Users' AND column_name = 'ClientID'
  ) THEN
    RAISE NOTICE 'Users.ClientID already exists, skipping rename';
  END IF;
END $$;

-- Drop old FK constraint if exists
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Try to drop any old FK constraints referencing CompanyID or old Companies table
  FOR r IN (
    SELECT conname FROM pg_constraint 
    WHERE conrelid = 'Users'::regclass 
    AND (conname LIKE '%CompanyID%' OR conname LIKE '%Company%')
  ) LOOP
    EXECUTE 'ALTER TABLE "Users" DROP CONSTRAINT "' || r.conname || '"';
  END LOOP;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Add new FK constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FK_Users_ClientID'
  ) THEN
    ALTER TABLE "Users" 
      ADD CONSTRAINT "FK_Users_ClientID" 
      FOREIGN KEY ("ClientID") REFERENCES "Clients"("ClientID");
  END IF;
END $$;

-- =============================================================================
-- STEP 6: Update Projects table - CompanyID -> ClientID
-- =============================================================================

-- Rename the foreign key column (if it exists as CompanyID)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Projects' AND column_name = 'CompanyID'
  ) THEN
    ALTER TABLE "Projects" RENAME COLUMN "CompanyID" TO "ClientID";
    RAISE NOTICE 'Renamed Projects.CompanyID to ClientID';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Projects' AND column_name = 'ClientID'
  ) THEN
    RAISE NOTICE 'Projects.ClientID already exists, skipping rename';
  END IF;
END $$;

-- Drop old FK constraint if exists
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT conname FROM pg_constraint 
    WHERE conrelid = 'Projects'::regclass 
    AND (conname LIKE '%CompanyID%' OR conname LIKE '%Company%')
  ) LOOP
    EXECUTE 'ALTER TABLE "Projects" DROP CONSTRAINT "' || r.conname || '"';
  END LOOP;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Add new FK constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FK_Projects_ClientID'
  ) THEN
    ALTER TABLE "Projects" 
      ADD CONSTRAINT "FK_Projects_ClientID" 
      FOREIGN KEY ("ClientID") REFERENCES "Clients"("ClientID");
  END IF;
END $$;

-- Drop old index and create new one
DROP INDEX IF EXISTS "IDX_PROJECT_COMPANY_STATUS";
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_PROJECT_CLIENT_STATUS'
  ) THEN
    CREATE INDEX "IDX_PROJECT_CLIENT_STATUS" ON "Projects" ("ClientID", "Status");
  END IF;
END $$;

-- =============================================================================
-- STEP 7: Update Persons table with new columns
-- =============================================================================

-- Make LinkedinUrl required (should already have data from previous migrations)
-- First ensure no nulls exist
UPDATE "Persons" SET "LinkedinUrl" = 'https://linkedin.com/in/unknown-' || "PersonID"::TEXT 
WHERE "LinkedinUrl" IS NULL;

-- Now make it NOT NULL (if not already)
ALTER TABLE "Persons" ALTER COLUMN "LinkedinUrl" SET NOT NULL;

-- Add unique constraint on LinkedinUrl if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_PERSON_LINKEDIN_URL'
  ) THEN
    CREATE UNIQUE INDEX "IDX_PERSON_LINKEDIN_URL" ON "Persons" ("LinkedinUrl");
  END IF;
END $$;

-- Add new columns to Persons
ALTER TABLE "Persons" ADD COLUMN IF NOT EXISTS "LinkedinSlug" VARCHAR(128);
ALTER TABLE "Persons" ADD COLUMN IF NOT EXISTS "ExternalUrn" VARCHAR(128);
ALTER TABLE "Persons" ADD COLUMN IF NOT EXISTS "FirstName" VARCHAR(128);
ALTER TABLE "Persons" ADD COLUMN IF NOT EXISTS "LastName" VARCHAR(128);
ALTER TABLE "Persons" ADD COLUMN IF NOT EXISTS "Headline" VARCHAR(512);
ALTER TABLE "Persons" ADD COLUMN IF NOT EXISTS "SubTitle" VARCHAR(512);
ALTER TABLE "Persons" ADD COLUMN IF NOT EXISTS "CurrentOrganizationID" BIGINT;
ALTER TABLE "Persons" ADD COLUMN IF NOT EXISTS "LocationID" BIGINT;

-- Make CreatedByUserID nullable (for PROJECT_LEVEL created persons)
DO $$
BEGIN
  ALTER TABLE "Persons" ALTER COLUMN "CreatedByUserID" DROP NOT NULL;
EXCEPTION
  WHEN OTHERS THEN NULL; -- Already nullable or column doesn't exist
END $$;

-- Add FK constraints for new columns (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FK_Persons_CurrentOrganizationID'
  ) THEN
    ALTER TABLE "Persons" 
      ADD CONSTRAINT "FK_Persons_CurrentOrganizationID" 
      FOREIGN KEY ("CurrentOrganizationID") REFERENCES "Organizations"("OrganizationID");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FK_Persons_LocationID'
  ) THEN
    ALTER TABLE "Persons" 
      ADD CONSTRAINT "FK_Persons_LocationID" 
      FOREIGN KEY ("LocationID") REFERENCES "Locations"("LocationID");
  END IF;
END $$;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS "IDX_PERSON_EXTERNAL_URN" ON "Persons" ("ExternalUrn");
CREATE INDEX IF NOT EXISTS "IDX_PERSON_CURRENT_ORG" ON "Persons" ("CurrentOrganizationID");
CREATE INDEX IF NOT EXISTS "IDX_PERSON_LOCATION" ON "Persons" ("LocationID");

-- =============================================================================
-- STEP 8: Verify migration
-- =============================================================================

-- Verify Clients table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Clients') THEN
    RAISE EXCEPTION 'Migration failed: Clients table not found';
  END IF;
END $$;

-- Verify Locations table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Locations') THEN
    RAISE EXCEPTION 'Migration failed: Locations table not found';
  END IF;
END $$;

-- Verify Organizations table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Organizations') THEN
    RAISE EXCEPTION 'Migration failed: Organizations table not found';
  END IF;
END $$;

-- Verify Users has ClientID
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Users' AND column_name = 'ClientID'
  ) THEN
    RAISE EXCEPTION 'Migration failed: Users.ClientID column not found';
  END IF;
END $$;

-- Verify Projects has ClientID
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Projects' AND column_name = 'ClientID'
  ) THEN
    RAISE EXCEPTION 'Migration failed: Projects.ClientID column not found';
  END IF;
END $$;

COMMIT;

-- =============================================================================
-- ROLLBACK INSTRUCTIONS (manual, if needed)
-- =============================================================================
-- 
-- To rollback this migration, run the following in order:
--
-- 1. Drop new FK constraints on Persons:
--    ALTER TABLE "Persons" DROP CONSTRAINT IF EXISTS "FK_Persons_CurrentOrganizationID";
--    ALTER TABLE "Persons" DROP CONSTRAINT IF EXISTS "FK_Persons_LocationID";
--
-- 2. Drop new columns on Persons:
--    ALTER TABLE "Persons" DROP COLUMN IF EXISTS "LinkedinSlug";
--    ALTER TABLE "Persons" DROP COLUMN IF EXISTS "ExternalUrn";
--    ALTER TABLE "Persons" DROP COLUMN IF EXISTS "FirstName";
--    ALTER TABLE "Persons" DROP COLUMN IF EXISTS "LastName";
--    ALTER TABLE "Persons" DROP COLUMN IF EXISTS "Headline";
--    ALTER TABLE "Persons" DROP COLUMN IF EXISTS "SubTitle";
--    ALTER TABLE "Persons" DROP COLUMN IF EXISTS "CurrentOrganizationID";
--    ALTER TABLE "Persons" DROP COLUMN IF EXISTS "LocationID";
--
-- 3. Revert Users.ClientID -> CompanyID:
--    ALTER TABLE "Users" DROP CONSTRAINT IF EXISTS "FK_Users_ClientID";
--    ALTER TABLE "Users" RENAME COLUMN "ClientID" TO "CompanyID";
--
-- 4. Revert Projects.ClientID -> CompanyID:
--    ALTER TABLE "Projects" DROP CONSTRAINT IF EXISTS "FK_Projects_ClientID";
--    ALTER TABLE "Projects" RENAME COLUMN "ClientID" TO "CompanyID";
--    DROP INDEX IF EXISTS "IDX_PROJECT_CLIENT_STATUS";
--    CREATE INDEX "IDX_PROJECT_COMPANY_STATUS" ON "Projects" ("CompanyID", "Status");
--
-- 5. Rename Clients back to Companies:
--    ALTER TABLE "Clients" RENAME TO "Companies";
--    ALTER TABLE "Companies" RENAME COLUMN "ClientID" TO "CompanyID";
--
-- 6. Drop new tables:
--    DROP TABLE IF EXISTS "Organizations";
--    DROP TABLE IF EXISTS "Locations";
--
-- 7. Drop new enums:
--    DROP TYPE IF EXISTS "CompanySizeRange";
--    DROP TYPE IF EXISTS "CompanyType";
