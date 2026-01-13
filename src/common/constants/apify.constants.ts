/**
 * Apify Actor Configuration Constants
 */

// Polling configuration
export const APIFY_POLL_INTERVAL_MS = 2000; // Poll every 2 seconds
export const APIFY_POLL_TIMEOUT_MS = 600000; // 10 minutes timeout

// API Base URL
export const APIFY_BASE_URL = 'https://api.apify.com/v2';

// Actor run statuses
export const ApifyRunStatus = {
  READY: 'READY',
  RUNNING: 'RUNNING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  TIMED_OUT: 'TIMED-OUT',
  ABORTED: 'ABORTED',
} as const;

export type ApifyRunStatusType =
  (typeof ApifyRunStatus)[keyof typeof ApifyRunStatus];
