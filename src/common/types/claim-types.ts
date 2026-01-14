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
