-- =============================================================================
-- Migration: 000_initial_schema.sql
-- Description: Initial database schema for fresh installations
-- 
-- IMPORTANT: This migration creates all tables that exist in the current
-- TypeORM entities. For fresh installations, all subsequent migrations
-- (001-010) will be no-ops since they only add/modify existing data.
-- =============================================================================

-- This migration should be regenerated when entities change significantly.
-- To regenerate:
-- 1. Drop your test database
-- 2. Enable synchronize: true in TypeORM config temporarily
-- 3. Start the app to let TypeORM create all tables
-- 4. Export the schema: pg_dump -s -O -x <dbname> > new_000.sql
-- 5. Clean up the exported SQL and replace this file
-- 6. Disable synchronize: false

-- For now, we'll use a minimal schema and let migrations 001-010 build it up.
-- This approach maintains backward compatibility with existing databases.

-- =============================================================================
-- ENUMS
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE "EntityStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DELETED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MEMBER', 'VIEWER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ModuleStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =============================================================================
-- Clients Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS "Clients" (
  "ClientID" BIGSERIAL PRIMARY KEY,
  "Name" VARCHAR(255) NOT NULL,
  "Slug" VARCHAR(64) UNIQUE,
  "Domain" VARCHAR(255),
  "Status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
  "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "UpdatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "IDX_CLIENT_STATUS" ON "Clients"("Status");

-- =============================================================================
-- Users Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS "Users" (
  "UserID" BIGSERIAL PRIMARY KEY,
  "ClientID" BIGINT NOT NULL REFERENCES "Clients"("ClientID"),
  "SupabaseUserID" VARCHAR(255) UNIQUE,
  "Email" VARCHAR(255) NOT NULL UNIQUE,
  "Name" VARCHAR(255) NOT NULL,
  "PasswordHash" VARCHAR(255),
  "Role" "UserRole" NOT NULL DEFAULT 'MEMBER',
  "Status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
  "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "UpdatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "IDX_USER_CLIENT" ON "Users"("ClientID");
CREATE INDEX IF NOT EXISTS "IDX_USER_EMAIL" ON "Users"("Email");
CREATE INDEX IF NOT EXISTS "IDX_USER_SUPABASE_ID" ON "Users"("SupabaseUserID");
CREATE INDEX IF NOT EXISTS "IDX_USER_STATUS" ON "Users"("Status");

-- =============================================================================
-- Projects Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS "Projects" (
  "ProjectID" BIGSERIAL PRIMARY KEY,
  "ClientID" BIGINT NOT NULL REFERENCES "Clients"("ClientID"),
  "Name" VARCHAR(255) NOT NULL,
  "Status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
  "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "UpdatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "IDX_PROJECT_CLIENT" ON "Projects"("ClientID");
CREATE INDEX IF NOT EXISTS "IDX_PROJECT_STATUS" ON "Projects"("Status");

-- =============================================================================
-- Modules Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS "Modules" (
  "ModuleID" BIGSERIAL PRIMARY KEY,
  "Key" VARCHAR(255) NOT NULL UNIQUE,
  "Name" VARCHAR(255) NOT NULL,
  "Description" TEXT,
  "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "UpdatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "IDX_MODULE_KEY" ON "Modules"("Key");
CREATE INDEX IF NOT EXISTS "IDX_MODULE_ACTIVE" ON "Modules"("IsActive");

-- =============================================================================
-- ModuleRuns Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS "ModuleRuns" (
  "ModuleRunID" BIGSERIAL PRIMARY KEY,
  "ModuleID" BIGINT NOT NULL REFERENCES "Modules"("ModuleID"),
  "ProjectID" BIGINT NOT NULL REFERENCES "Projects"("ProjectID"),
  "Status" "ModuleStatus" NOT NULL DEFAULT 'PENDING',
  "TriggeredByUserID" BIGINT REFERENCES "Users"("UserID"),
  "Config" JSONB,
  "StartedAt" TIMESTAMP WITH TIME ZONE,
  "FinishedAt" TIMESTAMP WITH TIME ZONE,
  "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "UpdatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "IDX_MODULE_RUN_MODULE" ON "ModuleRuns"("ModuleID");
CREATE INDEX IF NOT EXISTS "IDX_MODULE_RUN_PROJECT" ON "ModuleRuns"("ProjectID");
CREATE INDEX IF NOT EXISTS "IDX_MODULE_RUN_STATUS" ON "ModuleRuns"("Status");
CREATE INDEX IF NOT EXISTS "IDX_MODULE_RUN_USER" ON "ModuleRuns"("TriggeredByUserID");

-- =============================================================================
-- Persons Table (legacy structure for migration 001-006 compatibility)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "Persons" (
  "PersonID" BIGSERIAL PRIMARY KEY,
  "FirstName" VARCHAR(128),
  "LastName" VARCHAR(128),
  "PrimaryDisplayName" VARCHAR(255),
  "Headline" VARCHAR(512),
  "Status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
  "CreatedByUserID" BIGINT REFERENCES "Users"("UserID"),
  "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "UpdatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "IDX_PERSON_NAME" ON "Persons"("FirstName", "LastName");
CREATE INDEX IF NOT EXISTS "IDX_PERSON_STATUS" ON "Persons"("Status");

-- =============================================================================
-- PersonProjects Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS "PersonProjects" (
  "PersonProjectID" BIGSERIAL PRIMARY KEY,
  "PersonID" BIGINT NOT NULL REFERENCES "Persons"("PersonID"),
  "ProjectID" BIGINT NOT NULL REFERENCES "Projects"("ProjectID"),
  "Tag" VARCHAR(64),
  "CreatedByUserID" BIGINT NOT NULL REFERENCES "Users"("UserID"),
  "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "UpdatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UQ_PERSON_PROJECT" UNIQUE ("PersonID", "ProjectID")
);

CREATE INDEX IF NOT EXISTS "IDX_PERSON_PROJECT_PERSON" ON "PersonProjects"("PersonID");
CREATE INDEX IF NOT EXISTS "IDX_PERSON_PROJECT_PROJECT" ON "PersonProjects"("ProjectID");

-- =============================================================================
-- Documents Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS "Documents" (
  "DocumentID" BIGSERIAL PRIMARY KEY,
  "ProjectID" BIGINT REFERENCES "Projects"("ProjectID"),
  "PersonID" BIGINT REFERENCES "Persons"("PersonID"),
  "Source" VARCHAR(64) NOT NULL,
  "DocumentKind" VARCHAR(128) NOT NULL,
  "Uri" VARCHAR(2048),
  "ContentType" VARCHAR(128),
  "SizeBytes" BIGINT,
  "ContentHash" VARCHAR(128),
  "ContentText" TEXT,
  "ContentJson" JSONB,
  "MetaJson" JSONB,
  "IsValid" BOOLEAN NOT NULL DEFAULT TRUE,
  "InvalidatedMetaJson" JSONB,
  "ModuleRunID" BIGINT REFERENCES "ModuleRuns"("ModuleRunID"),
  "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "UpdatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "IDX_DOCUMENT_PROJECT" ON "Documents"("ProjectID");
CREATE INDEX IF NOT EXISTS "IDX_DOCUMENT_PERSON" ON "Documents"("PersonID");
CREATE INDEX IF NOT EXISTS "IDX_DOCUMENT_SOURCE" ON "Documents"("Source");
CREATE INDEX IF NOT EXISTS "IDX_DOCUMENT_KIND" ON "Documents"("DocumentKind");
CREATE INDEX IF NOT EXISTS "IDX_DOCUMENT_VALID" ON "Documents"("IsValid");
CREATE INDEX IF NOT EXISTS "IDX_DOCUMENT_MODULE_RUN" ON "Documents"("ModuleRunID");
