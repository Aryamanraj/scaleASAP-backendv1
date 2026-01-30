-- Migration: Workspace & Campaign Tables
-- Purpose: Add tables for frontend-v1 migration (workspace, experiments, campaigns, leads, outreach)
-- Date: 2026-01-28

-- ═══════════════════════════════════════════════════════════════════════════
-- ENUM TYPES
-- ═══════════════════════════════════════════════════════════════════════════

-- Onboarding Status
DO $$ BEGIN
    CREATE TYPE onboarding_status AS ENUM ('incomplete', 'complete');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Experiment Type
DO $$ BEGIN
    CREATE TYPE experiment_type AS ENUM ('bullseye', 'variable_a', 'variable_b', 'contrarian', 'long_shot');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Experiment Status
DO $$ BEGIN
    CREATE TYPE experiment_status AS ENUM ('pending', 'creating_hypotheses', 'finding_leads', 'prioritizing_leads', 'warmup_initiated', 'complete', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Campaign Status
DO $$ BEGIN
    CREATE TYPE campaign_status AS ENUM ('active', 'paused', 'completed', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Activity Type
DO $$ BEGIN
    CREATE TYPE activity_type AS ENUM ('campaign_created', 'discovery_started', 'discovery_completed', 'leads_found', 'leads_enriched', 'outreach_generated', 'lead_contacted', 'lead_responded', 'meeting_booked', 'campaign_paused', 'campaign_resumed', 'error_occurred');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Lead Status
DO $$ BEGIN
    CREATE TYPE lead_status AS ENUM ('found', 'enriching', 'enriched', 'drafted', 'queued', 'sent', 'responded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Lead Outcome
DO $$ BEGIN
    CREATE TYPE lead_outcome AS ENUM ('no_response', 'interested', 'meeting_booked', 'meeting_done', 'closed_won', 'closed_lost', 'rejected', 'unqualified');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Signal Type
DO $$ BEGIN
    CREATE TYPE signal_type AS ENUM ('funding', 'hiring', 'expansion', 'product_launch', 'partnership', 'leadership_change', 'news_mention', 'social_activity');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Outreach Format
DO $$ BEGIN
    CREATE TYPE outreach_format AS ENUM ('linkedin_connection', 'linkedin_message', 'linkedin_inmail', 'email_cold', 'email_warm');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Outreach Status
DO $$ BEGIN
    CREATE TYPE outreach_status AS ENUM ('draft', 'scheduled', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Discovery Session Status
DO $$ BEGIN
    CREATE TYPE discovery_session_status AS ENUM ('active', 'completed', 'abandoned');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- EXTEND PROJECTS TABLE (for Workspace functionality)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS "Website" VARCHAR(512);
ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS "FaviconUrl" VARCHAR(512);
ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS "OnboardingStatus" onboarding_status DEFAULT 'incomplete';
ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS "DiscoveryChatHistory" JSONB;
ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS "Settings" JSONB;
ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS "OwnerUserID" BIGINT REFERENCES "Users"("UserID");

CREATE INDEX IF NOT EXISTS "IDX_PROJECT_OWNER" ON "Projects" ("OwnerUserID");

-- ═══════════════════════════════════════════════════════════════════════════
-- ONBOARDING DATA TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "OnboardingData" (
    "OnboardingDataID" SERIAL PRIMARY KEY,
    "ProjectID" BIGINT NOT NULL UNIQUE REFERENCES "Projects"("ProjectID") ON DELETE CASCADE,
    "Data" JSONB NOT NULL,
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "IDX_ONBOARDING_PROJECT" ON "OnboardingData" ("ProjectID");

-- ═══════════════════════════════════════════════════════════════════════════
-- EXPERIMENTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "Experiments" (
    "ExperimentID" SERIAL PRIMARY KEY,
    "ProjectID" BIGINT NOT NULL REFERENCES "Projects"("ProjectID") ON DELETE CASCADE,
    "Name" VARCHAR(255) NOT NULL,
    "Type" experiment_type NOT NULL,
    "Pattern" TEXT,
    "Industries" JSONB,
    "Pain" TEXT,
    "Trigger" TEXT,
    "WizaFilters" JSONB,
    "OutreachAngle" TEXT,
    "Status" experiment_status DEFAULT 'pending',
    "LeadsFound" INT DEFAULT 0,
    "LeadsWarming" INT DEFAULT 0,
    "MeetingsBooked" INT DEFAULT 0,
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "IDX_EXPERIMENT_PROJECT" ON "Experiments" ("ProjectID");
CREATE INDEX IF NOT EXISTS "IDX_EXPERIMENT_PROJECT_STATUS" ON "Experiments" ("ProjectID", "Status");

-- ═══════════════════════════════════════════════════════════════════════════
-- CAMPAIGNS TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "Campaigns" (
    "CampaignID" SERIAL PRIMARY KEY,
    "ProjectID" BIGINT NOT NULL REFERENCES "Projects"("ProjectID") ON DELETE CASCADE,
    "ExperimentID" BIGINT REFERENCES "Experiments"("ExperimentID") ON DELETE SET NULL,
    "Name" VARCHAR(255) NOT NULL,
    "Status" campaign_status DEFAULT 'active',
    "Settings" JSONB,
    "DailyLeadLimit" INT DEFAULT 50,
    "AutopilotEnabled" BOOLEAN DEFAULT FALSE,
    "LastDiscoveryRun" TIMESTAMP WITH TIME ZONE,
    "NextDiscoveryRun" TIMESTAMP WITH TIME ZONE,
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "DeletedAt" TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS "IDX_CAMPAIGN_PROJECT" ON "Campaigns" ("ProjectID");
CREATE INDEX IF NOT EXISTS "IDX_CAMPAIGN_EXPERIMENT" ON "Campaigns" ("ExperimentID");
CREATE INDEX IF NOT EXISTS "IDX_CAMPAIGN_PROJECT_STATUS" ON "Campaigns" ("ProjectID", "Status");

-- ═══════════════════════════════════════════════════════════════════════════
-- CAMPAIGN ACTIVITIES TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "CampaignActivities" (
    "CampaignActivityID" SERIAL PRIMARY KEY,
    "CampaignID" BIGINT NOT NULL REFERENCES "Campaigns"("CampaignID") ON DELETE CASCADE,
    "ActivityType" activity_type NOT NULL,
    "Title" VARCHAR(255) NOT NULL,
    "Description" TEXT,
    "Metadata" JSONB,
    "Status" VARCHAR(50),
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "IDX_ACTIVITY_CAMPAIGN_DATE" ON "CampaignActivities" ("CampaignID", "CreatedAt");

-- ═══════════════════════════════════════════════════════════════════════════
-- LEADS TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "Leads" (
    "LeadID" SERIAL PRIMARY KEY,
    "CampaignID" BIGINT NOT NULL REFERENCES "Campaigns"("CampaignID") ON DELETE CASCADE,
    "ProjectID" BIGINT NOT NULL REFERENCES "Projects"("ProjectID") ON DELETE CASCADE,
    "PersonID" BIGINT REFERENCES "Persons"("PersonID") ON DELETE SET NULL,
    "FullName" VARCHAR(255) NOT NULL,
    "JobTitle" VARCHAR(255),
    "Company" VARCHAR(255),
    "LinkedinUrl" VARCHAR(512),
    "Email" VARCHAR(255),
    "Phone" VARCHAR(50),
    "Location" VARCHAR(255),
    "AvatarUrl" VARCHAR(512),
    "AiSummary" TEXT,
    "RelevanceScore" INT,
    "Status" lead_status DEFAULT 'found',
    "Outcome" lead_outcome,
    "OutcomeReason" TEXT,
    "RawData" JSONB,
    "EnrichmentData" JSONB,
    "OutboundMessage" TEXT,
    "ContactedAt" TIMESTAMP WITH TIME ZONE,
    "RespondedAt" TIMESTAMP WITH TIME ZONE,
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "IDX_LEAD_CAMPAIGN" ON "Leads" ("CampaignID");
CREATE INDEX IF NOT EXISTS "IDX_LEAD_PROJECT" ON "Leads" ("ProjectID");
CREATE INDEX IF NOT EXISTS "IDX_LEAD_PROJECT_STATUS" ON "Leads" ("ProjectID", "Status");
CREATE INDEX IF NOT EXISTS "IDX_LEAD_LINKEDIN" ON "Leads" ("LinkedinUrl");

-- ═══════════════════════════════════════════════════════════════════════════
-- LEAD SIGNALS TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "LeadSignals" (
    "LeadSignalID" SERIAL PRIMARY KEY,
    "LeadID" BIGINT NOT NULL REFERENCES "Leads"("LeadID") ON DELETE CASCADE,
    "Headline" VARCHAR(255) NOT NULL,
    "Description" TEXT,
    "SignalType" signal_type NOT NULL,
    "StrengthScore" INT,
    "Citations" JSONB,
    "DetectedAt" TIMESTAMP WITH TIME ZONE,
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "IDX_SIGNAL_LEAD" ON "LeadSignals" ("LeadID");

-- ═══════════════════════════════════════════════════════════════════════════
-- OUTREACH MESSAGES TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "OutreachMessages" (
    "OutreachMessageID" SERIAL PRIMARY KEY,
    "LeadID" BIGINT NOT NULL REFERENCES "Leads"("LeadID") ON DELETE CASCADE,
    "CampaignID" BIGINT NOT NULL REFERENCES "Campaigns"("CampaignID") ON DELETE CASCADE,
    "Format" outreach_format NOT NULL,
    "IsFollowup" BOOLEAN DEFAULT FALSE,
    "SequenceNumber" INT DEFAULT 1,
    "Content" TEXT NOT NULL,
    "Subject" VARCHAR(255),
    "Status" outreach_status DEFAULT 'draft',
    "ScheduledAt" TIMESTAMP WITH TIME ZONE,
    "SentAt" TIMESTAMP WITH TIME ZONE,
    "OpenedAt" TIMESTAMP WITH TIME ZONE,
    "RepliedAt" TIMESTAMP WITH TIME ZONE,
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "IDX_OUTREACH_LEAD" ON "OutreachMessages" ("LeadID");
CREATE INDEX IF NOT EXISTS "IDX_OUTREACH_CAMPAIGN" ON "OutreachMessages" ("CampaignID");

-- ═══════════════════════════════════════════════════════════════════════════
-- DISCOVERY SESSIONS TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "DiscoverySessions" (
    "DiscoverySessionID" SERIAL PRIMARY KEY,
    "ProjectID" BIGINT NOT NULL REFERENCES "Projects"("ProjectID") ON DELETE CASCADE,
    "Messages" JSONB,
    "GeneratedIcps" JSONB,
    "Status" discovery_session_status DEFAULT 'active',
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "IDX_DISCOVERY_PROJECT" ON "DiscoverySessions" ("ProjectID");

-- ═══════════════════════════════════════════════════════════════════════════
-- DISCOVERY FEEDBACK TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "DiscoveryFeedback" (
    "DiscoveryFeedbackID" SERIAL PRIMARY KEY,
    "ProjectID" BIGINT NOT NULL REFERENCES "Projects"("ProjectID") ON DELETE CASCADE,
    "UserID" BIGINT NOT NULL REFERENCES "Users"("UserID") ON DELETE CASCADE,
    "Rating" INT NOT NULL CHECK ("Rating" >= 1 AND "Rating" <= 5),
    "Feedback" TEXT,
    "ExperimentContext" JSONB,
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "IDX_FEEDBACK_PROJECT" ON "DiscoveryFeedback" ("ProjectID");

-- ═══════════════════════════════════════════════════════════════════════════
-- UPDATED_AT TRIGGER FUNCTION
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."UpdatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all new tables with UpdatedAt
DO $$ 
DECLARE
    tables TEXT[] := ARRAY['OnboardingData', 'Experiments', 'Campaigns', 'Leads', 'OutreachMessages', 'DiscoverySessions'];
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON "%s"', lower(tbl), tbl);
        EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON "%s" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', lower(tbl), tbl);
    END LOOP;
END $$;
