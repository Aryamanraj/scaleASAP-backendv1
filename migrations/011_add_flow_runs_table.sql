-- Migration: FlowRuns Table
-- Purpose: Track end-to-end indexer flow executions
-- Date: 2026-02-04

-- ═══════════════════════════════════════════════════════════════════════════
-- ENUM TYPES
-- ═══════════════════════════════════════════════════════════════════════════

-- Flow run status enum
DO $$ BEGIN
    CREATE TYPE flow_run_status AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- FLOW RUNS TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "FlowRuns" (
    "FlowRunID" BIGSERIAL PRIMARY KEY,
    "ProjectID" BIGINT NOT NULL REFERENCES "Projects"("ProjectID") ON DELETE CASCADE,
    "PersonID" BIGINT NULL REFERENCES "Persons"("PersonID") ON DELETE SET NULL,
    "TriggeredByUserID" BIGINT NULL REFERENCES "Users"("UserID") ON DELETE SET NULL,
    "FlowKey" VARCHAR(128) NOT NULL,
    "InputSummaryJson" JSONB,
    "ModulesScheduledJson" JSONB,
    "ModulesCompletedJson" JSONB,
    "ModulesFailedJson" JSONB,
    "FailureReasonsJson" JSONB,
    "Status" flow_run_status NOT NULL DEFAULT 'QUEUED',
    "StartedAt" TIMESTAMP WITH TIME ZONE NULL,
    "FinishedAt" TIMESTAMP WITH TIME ZONE NULL,
    "ErrorJson" JSONB,
    "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_flow_runs_project_id ON "FlowRuns"("ProjectID");
CREATE INDEX IF NOT EXISTS idx_flow_runs_person_id ON "FlowRuns"("PersonID");
CREATE INDEX IF NOT EXISTS idx_flow_runs_flow_key ON "FlowRuns"("FlowKey");
CREATE INDEX IF NOT EXISTS idx_flow_runs_project_person_created ON "FlowRuns"("ProjectID", "PersonID", "CreatedAt");
CREATE INDEX IF NOT EXISTS idx_flow_runs_flow_key_created ON "FlowRuns"("FlowKey", "CreatedAt");

-- Trigger for UpdatedAt
CREATE OR REPLACE FUNCTION update_flow_runs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."UpdatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS flow_runs_updated_at ON "FlowRuns";
CREATE TRIGGER flow_runs_updated_at
    BEFORE UPDATE ON "FlowRuns"
    FOR EACH ROW
    EXECUTE FUNCTION update_flow_runs_updated_at();

-- Comment
COMMENT ON TABLE "FlowRuns" IS 'Tracks end-to-end indexer flow executions and module outcomes';
