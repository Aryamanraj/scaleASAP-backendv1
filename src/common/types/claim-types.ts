/**
 * Claim Type Constants
 * Used to identify different types of claims in the system
 */
export const ClaimType = {
  CORE_IDENTITY_LEGAL_NAME: 'core_identity.legal_name',
  CORE_IDENTITY_LOCATION: 'core_identity.location',
  CORE_IDENTITY_EDUCATION_ITEM: 'core_identity.education_item',
  CORE_IDENTITY_CAREER_ROLE: 'core_identity.career_role',
  CORE_IDENTITY_CERTIFICATION: 'core_identity.certification',
  CORE_IDENTITY_BOARD_POSITION: 'core_identity.board_position',
  CORE_IDENTITY_AGE_RANGE: 'core_identity.age_range',
} as const;

/**
 * Claim Key Enum (preferred for new code)
 */
export enum CLAIM_KEY {
  CORE_LEGAL_NAME = 'core_identity.legal_name',
  CORE_LOCATION = 'core_identity.location',
  CORE_EDUCATION_ITEM = 'core_identity.education_item',
  CORE_CAREER_ROLE = 'core_identity.career_role',
  CORE_CERTIFICATION = 'core_identity.certification',
  CORE_BOARD_POSITION = 'core_identity.board_position',
  CORE_AGE_RANGE = 'core_identity.age_range',

  DIGITAL_EMAIL_PATTERN = 'digital_identity.email_pattern',
  DIGITAL_PROFILE_PHOTO_SIGNAL = 'digital_identity.profile_photo_signal',
  DIGITAL_BIO_EVOLUTION = 'digital_identity.bio_evolution',
  DIGITAL_DOMAIN_OWNERSHIP = 'digital_identity.domain_ownership',

  PERSONALITY_ACTIVE_TIMES = 'personality.active_times',

  INSIGHTS_DECISION_MAKER_BRAND = 'insights.decision_maker_brand',
  INSIGHTS_REVENUE_SIGNAL = 'insights.revenue_signal',
  INSIGHTS_LINKEDIN_ACTIVITY = 'insights.linkedin_activity',
  INSIGHTS_COMPETITOR_MENTIONS = 'insights.competitor_mentions',
  INSIGHTS_HIRING_SIGNALS = 'insights.hiring_signals',
  INSIGHTS_TOPIC_THEMES = 'insights.topic_themes',
  INSIGHTS_TONE_SIGNALS = 'insights.tone_signals',
  INSIGHTS_COLLEAGUE_NETWORK = 'insights.colleague_network',
  INSIGHTS_EXTERNAL_SOCIALS = 'insights.external_socials',
  INSIGHTS_EVENT_ATTENDANCE = 'insights.event_attendance',
  INSIGHTS_LOW_QUALITY_ENGAGEMENT = 'insights.low_quality_engagement',
  INSIGHTS_DESIGN_HELP_SIGNALS = 'insights.design_help_signals',
  INSIGHTS_FINAL_SUMMARY = 'insights.final_summary',
}

/**
 * Document Source Constants
 */
export const DocumentSource = {
  MANUAL: 'MANUAL',
  LINKEDIN: 'LINKEDIN',
  RESUME: 'RESUME',
  GITHUB: 'GITHUB',
  WEB: 'WEB',
} as const;

export type DocumentSourceType =
  (typeof DocumentSource)[keyof typeof DocumentSource];
