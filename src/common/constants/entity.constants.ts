// scaleASAP Entity Status Values
export enum EntityStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

// User Role Values
export enum UserRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

// Project User Role Values
export enum ProjectUserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

// Project Status Values
export enum ProjectStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
}

// Module Type Values
export enum ModuleType {
  CONNECTOR = 'CONNECTOR',
  ENRICHER = 'ENRICHER',
  COMPOSER = 'COMPOSER',
}

// Module Scope Values
export enum ModuleScope {
  PERSON_LEVEL = 'PERSON_LEVEL',
  PROJECT_LEVEL = 'PROJECT_LEVEL',
}

// Module Run Status Values
export enum ModuleRunStatus {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

// Discovery Run Item Status Values
export enum DiscoveryRunItemStatus {
  CREATED = 'CREATED',
  FAILED = 'FAILED',
}

// Company Size Range Values (for prospect/employer organizations)
// NOTE: Values must match PostgreSQL enum values exactly
export enum CompanySizeRange {
  SIZE_1_10 = 'SIZE_1_10',
  SIZE_11_50 = 'SIZE_11_50',
  SIZE_51_200 = 'SIZE_51_200',
  SIZE_201_500 = 'SIZE_201_500',
  SIZE_501_1000 = 'SIZE_501_1000',
  SIZE_1001_5000 = 'SIZE_1001_5000',
  SIZE_5001_10000 = 'SIZE_5001_10000',
  SIZE_10001_PLUS = 'SIZE_10001_PLUS',
}

// Company Type Values (for prospect/employer organizations)
export enum CompanyType {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  NONPROFIT = 'NONPROFIT',
  GOVERNMENT = 'GOVERNMENT',
  EDUCATIONAL = 'EDUCATIONAL',
  SELF_EMPLOYED = 'SELF_EMPLOYED',
  PARTNERSHIP = 'PARTNERSHIP',
  OTHER = 'OTHER',
}
