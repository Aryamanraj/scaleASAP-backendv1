/**
 * Module Key Constants
 * Used to identify different modules in the system
 */

export const MODULE_KEYS = {
  // Connectors
  MANUAL_DOCUMENT_CONNECTOR: 'manual-document-connector',
  LINKEDIN_PROFILE_CONNECTOR: 'linkedin-profile-connector',
  LINKEDIN_POSTS_CONNECTOR: 'linkedin-posts-connector',

  // Enrichers
  CORE_IDENTITY_ENRICHER: 'core-identity-enricher',
  LINKEDIN_CORE_IDENTITY_ENRICHER: 'linkedin-core-identity-enricher',
  LINKEDIN_DIGITAL_IDENTITY_ENRICHER: 'linkedin-digital-identity-enricher',

  // Composers
  LAYER_1_COMPOSER: 'layer-1-composer',

  // Testing
  NOOP_MODULE: 'noop-module',
} as const;

export type ModuleKeyType = (typeof MODULE_KEYS)[keyof typeof MODULE_KEYS];
