-- Migration: Generated Messages Table
-- Purpose: Store AI-generated outreach messages for leads
-- Date: 2026-02-01

-- ═══════════════════════════════════════════════════════════════════════════
-- ENUM TYPES
-- ═══════════════════════════════════════════════════════════════════════════

-- Platform enum
DO $$ BEGIN
    CREATE TYPE message_platform AS ENUM ('linkedin', 'email');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Message type enum
DO $$ BEGIN
    CREATE TYPE message_type AS ENUM ('connection_request', 'follow_up', 'first_touch', 'custom');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- GENERATED MESSAGES TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "GeneratedMessages" (
    "GeneratedMessageID" BIGSERIAL PRIMARY KEY,
    "LeadID" BIGINT NOT NULL REFERENCES "Leads"("LeadID") ON DELETE CASCADE,
    "Platform" message_platform NOT NULL,
    "MessageType" message_type NOT NULL,
    "Content" TEXT NOT NULL,
    "Context" TEXT,
    "Thinking" JSONB,
    "Timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_generated_messages_lead_id ON "GeneratedMessages"("LeadID");
CREATE INDEX IF NOT EXISTS idx_generated_messages_platform ON "GeneratedMessages"("Platform");
CREATE INDEX IF NOT EXISTS idx_generated_messages_lead_platform ON "GeneratedMessages"("LeadID", "Platform");

-- Trigger for UpdatedAt
CREATE OR REPLACE FUNCTION update_generated_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."UpdatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS generated_messages_updated_at ON "GeneratedMessages";
CREATE TRIGGER generated_messages_updated_at
    BEFORE UPDATE ON "GeneratedMessages"
    FOR EACH ROW
    EXECUTE FUNCTION update_generated_messages_updated_at();

-- Comment
COMMENT ON TABLE "GeneratedMessages" IS 'Stores AI-generated outreach messages for leads, including LinkedIn connection requests and follow-up DMs';
