/**
 * Timezone Constants
 * Maps country codes to their primary timezone
 */

export const COUNTRY_CODE_TO_TIMEZONE: Record<string, string> = {
  IN: 'Asia/Kolkata',
  US: 'America/New_York',
  GB: 'Europe/London',
  SG: 'Asia/Singapore',
  AU: 'Australia/Sydney',
};

/**
 * Board position keywords for deterministic detection
 */
export const BOARD_POSITION_KEYWORDS = [
  'board member',
  'advisor',
  'advisory',
  'independent director',
  'director (board)',
  'trustee',
  'governor',
  'board of directors',
] as const;
