-- Migration: Add FlowSetID to FlowRuns
-- Purpose: Allow grouping multiple flow runs under a single batch
-- Date: 2026-02-05

ALTER TABLE "FlowRuns"
  ADD COLUMN IF NOT EXISTS "FlowSetID" VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_flow_runs_flow_set_id ON "FlowRuns"("FlowSetID");

COMMENT ON COLUMN "FlowRuns"."FlowSetID" IS 'Batch identifier to group flow runs created together';
