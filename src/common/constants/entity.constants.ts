// scaleASAP Entity Status Values
export enum EntityStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

// User Role Values
export enum UserRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

// Project User Role Values
export enum ProjectUserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

// Project Status Values
export enum ProjectStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
}

// Module Type Values
export enum ModuleType {
  CONNECTOR = 'CONNECTOR',
  ENRICHER = 'ENRICHER',
  COMPOSER = 'COMPOSER',
}

// Module Scope Values
export enum ModuleScope {
  PERSON_LEVEL = 'PERSON_LEVEL',
  PROJECT_LEVEL = 'PROJECT_LEVEL',
}

// Module Run Status Values
export enum ModuleRunStatus {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

// Discovery Run Item Status Values
export enum DiscoveryRunItemStatus {
  CREATED = 'CREATED',
  FAILED = 'FAILED',
}

// Company Size Range Values (for prospect/employer organizations)
// NOTE: Values must match PostgreSQL enum values exactly
export enum CompanySizeRange {
  SIZE_1_10 = 'SIZE_1_10',
  SIZE_11_50 = 'SIZE_11_50',
  SIZE_51_200 = 'SIZE_51_200',
  SIZE_201_500 = 'SIZE_201_500',
  SIZE_501_1000 = 'SIZE_501_1000',
  SIZE_1001_5000 = 'SIZE_1001_5000',
  SIZE_5001_10000 = 'SIZE_5001_10000',
  SIZE_10001_PLUS = 'SIZE_10001_PLUS',
}

// Company Type Values (for prospect/employer organizations)
export enum CompanyType {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  NONPROFIT = 'NONPROFIT',
  GOVERNMENT = 'GOVERNMENT',
  EDUCATIONAL = 'EDUCATIONAL',
  SELF_EMPLOYED = 'SELF_EMPLOYED',
  PARTNERSHIP = 'PARTNERSHIP',
  OTHER = 'OTHER',
}

// ═══════════════════════════════════════════════════════════════════════════
// WORKSPACE / CAMPAIGN ENUMS (frontend-v1 migration)
// ═══════════════════════════════════════════════════════════════════════════

// Onboarding Status (for Project/Workspace)
export enum OnboardingStatus {
  INCOMPLETE = 'incomplete',
  COMPLETE = 'complete',
}

// Experiment Types
export enum ExperimentType {
  BULLSEYE = 'bullseye',
  VARIABLE_A = 'variable_a',
  VARIABLE_B = 'variable_b',
  CONTRARIAN = 'contrarian',
  LONG_SHOT = 'long_shot',
}

// Experiment Status
export enum ExperimentStatus {
  PENDING = 'pending',
  CREATING_HYPOTHESES = 'creating_hypotheses',
  FINDING_LEADS = 'finding_leads',
  PRIORITIZING_LEADS = 'prioritizing_leads',
  WARMUP_INITIATED = 'warmup_initiated',
  COMPLETE = 'complete',
  FAILED = 'failed',
}

// Campaign Status
export enum CampaignStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

// Campaign Activity Types
export enum ActivityType {
  CAMPAIGN_CREATED = 'campaign_created',
  DISCOVERY_STARTED = 'discovery_started',
  DISCOVERY_COMPLETED = 'discovery_completed',
  LEADS_FOUND = 'leads_found',
  LEADS_ENRICHED = 'leads_enriched',
  OUTREACH_GENERATED = 'outreach_generated',
  LEAD_CONTACTED = 'lead_contacted',
  LEAD_RESPONDED = 'lead_responded',
  MEETING_BOOKED = 'meeting_booked',
  CAMPAIGN_PAUSED = 'campaign_paused',
  CAMPAIGN_RESUMED = 'campaign_resumed',
  ERROR_OCCURRED = 'error_occurred',
}

// Lead Status
export enum LeadStatus {
  FOUND = 'found',
  ENRICHING = 'enriching',
  ENRICHED = 'enriched',
  DRAFTED = 'drafted',
  QUEUED = 'queued',
  SENT = 'sent',
  RESPONDED = 'responded',
}

// Lead Outcome
export enum LeadOutcome {
  NO_RESPONSE = 'no_response',
  INTERESTED = 'interested',
  MEETING_BOOKED = 'meeting_booked',
  MEETING_DONE = 'meeting_done',
  CLOSED_WON = 'closed_won',
  CLOSED_LOST = 'closed_lost',
  REJECTED = 'rejected',
  UNQUALIFIED = 'unqualified',
}

// Signal Types for Leads
export enum SignalType {
  FUNDING = 'funding',
  HIRING = 'hiring',
  EXPANSION = 'expansion',
  PRODUCT_LAUNCH = 'product_launch',
  PARTNERSHIP = 'partnership',
  LEADERSHIP_CHANGE = 'leadership_change',
  NEWS_MENTION = 'news_mention',
  SOCIAL_ACTIVITY = 'social_activity',
}

// Outreach Message Formats
export enum OutreachFormat {
  LINKEDIN_CONNECTION = 'linkedin_connection',
  LINKEDIN_MESSAGE = 'linkedin_message',
  LINKEDIN_INMAIL = 'linkedin_inmail',
  EMAIL_COLD = 'email_cold',
  EMAIL_WARM = 'email_warm',
}

// Outreach Message Status
export enum OutreachStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  SENT = 'sent',
  DELIVERED = 'delivered',
  OPENED = 'opened',
  CLICKED = 'clicked',
  REPLIED = 'replied',
  BOUNCED = 'bounced',
  FAILED = 'failed',
}

// Discovery Session Status
export enum DiscoverySessionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
}

// Async Job Types (for queue job tracking)
export enum AsyncJobType {
  DISCOVERY_CHAT = 'discovery_chat',
  GENERATE_EXPERIMENTS = 'generate_experiments',
  LEAD_ENRICHMENT = 'lead_enrichment',
  BULK_LEAD_ENRICHMENT = 'bulk_lead_enrichment',
  GENERATE_OUTREACH = 'generate_outreach',
  BULK_GENERATE_OUTREACH = 'bulk_generate_outreach',
  WEBSITE_SCRAPE = 'website_scrape',
  CAMPAIGN_SCALE = 'campaign_scale',
  DATA_EXPORT = 'data_export',
  WIZA_SEARCH = 'wiza_search',
}
