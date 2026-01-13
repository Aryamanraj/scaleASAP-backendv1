/**
 * LinkedIn Connector Constants
 */

// Module keys
export const LINKEDIN_PROFILE_CONNECTOR_KEY = 'linkedin-profile-connector';
export const LINKEDIN_POSTS_CONNECTOR_KEY = 'linkedin-posts-connector';

// Default Apify actors
export const DEFAULT_LINKEDIN_PROFILE_ACTOR =
  'apimaestro/linkedin-profile-full-sections-scraper';
export const DEFAULT_LINKEDIN_POSTS_ACTOR = 'apimaestro/linkedin-profile-posts';

// Document types
export const LINKEDIN_DOCUMENT_TYPE = {
  PROFILE: 'linkedin_profile',
  POSTS: 'linkedin_posts',
} as const;
