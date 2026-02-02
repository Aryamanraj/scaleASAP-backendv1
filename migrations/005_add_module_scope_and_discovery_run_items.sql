-- Migration: Add ModuleScope, nullable PersonID, and DiscoveryRunItems
-- This migration adds support for PROJECT_LEVEL modules
-- Run this AFTER migrations 001-004 (LinkedIn URL normalization)

-- =============================================================================
-- STEP 1: Add ModuleScope enum and Scope column to Modules table
-- =============================================================================

-- Create the enum type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'modulescope') THEN
        CREATE TYPE "ModuleScope" AS ENUM ('PERSON_LEVEL', 'PROJECT_LEVEL');
    END IF;
END$$;

-- Add Scope column with default PERSON_LEVEL (existing modules remain person-level)
ALTER TABLE "Modules"
ADD COLUMN IF NOT EXISTS "Scope" "ModuleScope" NOT NULL DEFAULT 'PERSON_LEVEL';

-- =============================================================================
-- STEP 2: Make PersonID nullable in ModuleRuns (if column exists)
-- =============================================================================

-- Allow null PersonID for PROJECT_LEVEL runs
DO $$
BEGIN
  -- Check if PersonID column exists before trying to alter it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ModuleRuns' AND column_name = 'PersonID'
  ) THEN
    ALTER TABLE "ModuleRuns" ALTER COLUMN "PersonID" DROP NOT NULL;
  END IF;
END $$;

-- =============================================================================
-- STEP 3: Make PersonID nullable in Documents
-- =============================================================================

-- Allow null PersonID for project-level documents
ALTER TABLE "Documents"
ALTER COLUMN "PersonID" DROP NOT NULL;

-- =============================================================================
-- STEP 4: Add DiscoveryRunItemStatus enum
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'discoveryrunitemstatus') THEN
        CREATE TYPE "DiscoveryRunItemStatus" AS ENUM ('CREATED', 'FAILED');
    END IF;
END$$;

-- =============================================================================
-- STEP 5: Create DiscoveryRunItems table
-- =============================================================================

CREATE TABLE IF NOT EXISTS "DiscoveryRunItems" (
    "DiscoveryRunItemID" SERIAL PRIMARY KEY,
    "ModuleRunID" BIGINT NOT NULL,
    "ProjectID" BIGINT NOT NULL,
    "PersonID" BIGINT,
    "SourceRef" VARCHAR(255),
    "CreatedDocumentID" BIGINT,
    "Status" "DiscoveryRunItemStatus" NOT NULL,
    "ErrorJson" JSONB,
    "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT "FK_DiscoveryRunItems_ModuleRun" 
        FOREIGN KEY ("ModuleRunID") REFERENCES "ModuleRuns"("ModuleRunID") ON DELETE CASCADE,
    CONSTRAINT "FK_DiscoveryRunItems_Project" 
        FOREIGN KEY ("ProjectID") REFERENCES "Projects"("ProjectID") ON DELETE CASCADE,
    CONSTRAINT "FK_DiscoveryRunItems_Person" 
        FOREIGN KEY ("PersonID") REFERENCES "Persons"("PersonID") ON DELETE SET NULL,
    CONSTRAINT "FK_DiscoveryRunItems_Document" 
        FOREIGN KEY ("CreatedDocumentID") REFERENCES "Documents"("DocumentID") ON DELETE SET NULL
);

-- Create indexes for DiscoveryRunItems
CREATE INDEX IF NOT EXISTS "IDX_DISCOVERY_RUN_ITEMS_MODULE_PROJECT" 
    ON "DiscoveryRunItems" ("ModuleRunID", "ProjectID");

CREATE INDEX IF NOT EXISTS "IDX_DISCOVERY_RUN_ITEMS_PROJECT_PERSON" 
    ON "DiscoveryRunItems" ("ProjectID", "PersonID");

-- =============================================================================
-- STEP 6: Register prospect-search-connector as PROJECT_LEVEL module
-- =============================================================================

-- Update existing prospect-search-connector module to PROJECT_LEVEL if it exists
UPDATE "Modules"
SET "Scope" = 'PROJECT_LEVEL'
WHERE "ModuleKey" = 'prospect-search-connector';

-- =============================================================================
-- VERIFICATION QUERIES (run manually to verify migration)
-- =============================================================================

-- Check ModuleScope enum exists:
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'modulescope');

-- Check Scope column exists in Modules:
-- SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'Modules' AND column_name = 'Scope';

-- Check PersonID is nullable in ModuleRuns:
-- SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'ModuleRuns' AND column_name = 'PersonID';

-- Check DiscoveryRunItems table exists:
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'DiscoveryRunItems';
