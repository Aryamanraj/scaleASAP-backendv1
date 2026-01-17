/**
 * Posts and Content Analysis Types
 */

export enum DATA_SOURCE {
  LINKEDIN = 'LINKEDIN',
  X = 'X',
  TWITTER = 'TWITTER',
  GITHUB = 'GITHUB',
  BLOG = 'BLOG',
  OTHER = 'OTHER',
}

export enum CHUNK_TYPE {
  MONTHLY = 'MONTHLY',
  BATCH = 'BATCH',
}

export enum CHUNK_STATUS {
  CREATED = 'CREATED',
  POPULATED = 'POPULATED',
  EVIDENCE_READY = 'EVIDENCE_READY',
}

export enum EVIDENCE_STATUS {
  CREATED = 'CREATED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}
