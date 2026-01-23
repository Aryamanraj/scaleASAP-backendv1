/**
 * Scraper Service Configuration
 * Values match wiza-scraper defaults
 */

export const SCRAPER_CONFIG = {
  DEFAULT_TIMEOUT_MS: 30000,
  DEFAULT_MAX_RETRIES: 3,
  DEFAULT_BASE_DELAY_MS: 1000,
  DEFAULT_CONCURRENCY: 1,
  DEFAULT_INTERVAL_MS: 1000,
  SESSION_FILE_PATH: './.scraper-session.json',
  USER_AGENT:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  SEARCH_PATH: '/svc/app/prospect/search',
  PROFILE_PATH: '/svc/app/prospect/profile',
  AUTH_LOGIN_PATH: '/svc/auth/login',
  AUTH_CSRF_PATH: '/svc/auth/csrf-token',
} as const;
