/**
 * Document Types and Enums
 */

export enum DocumentKind {
  LINKEDIN_PROFILE = 'linkedin_profile',
  LINKEDIN_POSTS = 'linkedin_posts',
  PROSPECT_SEARCH = 'prospect_search',
  PROSPECT_SEARCH_RESULTS = 'prospect_search_results',
  PROSPECT_PERSON_SNAPSHOT = 'prospect_person_snapshot',
  // Future: X_PROFILE, X_POSTS, GITHUB_PROFILE, etc.
}

export enum DocumentSource {
  LINKEDIN = 'LINKEDIN',
  MANUAL = 'MANUAL',
  PROSPECT = 'PROSPECT',
  // Future: X, GITHUB, etc.
}
