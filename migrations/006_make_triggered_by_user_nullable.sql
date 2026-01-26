-- Migration: Make TriggeredByUserID nullable for PROJECT_LEVEL module runs
-- This allows admin-triggered runs without a specific user context

ALTER TABLE "ModuleRuns" ALTER COLUMN "TriggeredByUserID" DROP NOT NULL;

-- Add comment explaining the nullable behavior
COMMENT ON COLUMN "ModuleRuns"."TriggeredByUserID" IS 'UserID who triggered the run. Nullable for admin-triggered PROJECT_LEVEL runs.';
