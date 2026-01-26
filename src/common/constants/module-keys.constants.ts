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

  // Testing
  NOOP_MODULE: 'noop-module',
} as const;

export type ModuleKeyType = (typeof MODULE_KEYS)[keyof typeof MODULE_KEYS];
