-- Migration: Add FinalSummaryJson to FlowRuns
-- Purpose: Store final summary claim payload on flow run
-- Date: 2026-02-04

ALTER TABLE "FlowRuns"
  ADD COLUMN IF NOT EXISTS "FinalSummaryJson" JSONB;

COMMENT ON COLUMN "FlowRuns"."FinalSummaryJson" IS 'Final summary payload for the flow (from final summary composer claim)';
