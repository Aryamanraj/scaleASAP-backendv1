/**
 * Module Key Constants
 * Used to identify different modules in the system
 */

export const MODULE_KEYS = {
  // Connectors
  MANUAL_DOCUMENT_CONNECTOR: 'manual-document-connector',
  LINKEDIN_PROFILE_CONNECTOR: 'linkedin-profile-connector',
  LINKEDIN_POSTS_CONNECTOR: 'linkedin-posts-connector',
  PROSPECT_SEARCH_CONNECTOR: 'prospect-search-connector',

  // Enrichers
  CORE_IDENTITY_ENRICHER: 'core-identity-enricher',
  LINKEDIN_CORE_IDENTITY_ENRICHER: 'linkedin-core-identity-enricher',
  LINKEDIN_DIGITAL_IDENTITY_ENRICHER: 'linkedin-digital-identity-enricher',
  LINKEDIN_POSTS_NORMALIZER: 'linkedin-posts-normalizer',
  CONTENT_CHUNKER: 'content-chunker',
  LINKEDIN_POSTS_CHUNK_EVIDENCE_EXTRACTOR:
    'linkedin-posts-chunk-evidence-extractor',
  PERSONALITY_ACTIVE_TIMES_REDUCER: 'personality-active-times-reducer',

  // Composers
  LAYER_1_COMPOSER: 'layer-1-composer',
  DECISION_MAKER_BRAND_COMPOSER: 'decision-maker-brand-composer',
  REVENUE_SIGNAL_COMPOSER: 'revenue-signal-composer',
  LINKEDIN_ACTIVITY_COMPOSER: 'linkedin-activity-composer',
  COMPETITOR_MENTIONS_COMPOSER: 'competitor-mentions-composer',
  HIRING_SIGNALS_COMPOSER: 'hiring-signals-composer',
  TOPIC_THEMES_COMPOSER: 'topic-themes-composer',
  TONE_SIGNALS_COMPOSER: 'tone-signals-composer',
  COLLEAGUE_NETWORK_COMPOSER: 'colleague-network-composer',
  EXTERNAL_SOCIALS_COMPOSER: 'external-socials-composer',
  EVENT_ATTENDANCE_COMPOSER: 'event-attendance-composer',
  LOW_QUALITY_ENGAGEMENT_COMPOSER: 'low-quality-engagement-composer',
  DESIGN_HELP_SIGNALS_COMPOSER: 'design-help-signals-composer',
  FINAL_SUMMARY_COMPOSER: 'final-summary-composer',

  // Testing
  NOOP_MODULE: 'noop-module',
} as const;

export type ModuleKeyType = (typeof MODULE_KEYS)[keyof typeof MODULE_KEYS];
