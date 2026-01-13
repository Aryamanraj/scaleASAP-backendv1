/**
 * Enricher Interfaces
 * Shared interfaces for enricher modules
 */

/**
 * Result data structure returned by enrichers
 */
export interface EnricherExecutionResult {
  claimsCreated: number;
  claimIds: number[];
}

/**
 * Claim data structure for creating claims
 */
export interface ClaimData {
  ClaimType: string;
  GroupKey: string | null;
  ValueJson: any;
  Confidence: number;
  ObservedAt: Date;
  SourceDocumentID: number;
  ModuleRunID: number;
  SchemaVersion: string;
}

/**
 * Evidence metadata stored with claims
 */
export interface ClaimEvidenceJson {
  documentId: number;
  moduleRunId: number;
  capturedAt?: string;
  source?: string;
  path?: string;
}

/**
 * Parsed LinkedIn profile education entry
 */
export interface ParsedLinkedinEducation {
  school: string;
  degree: string;
  field: string;
  startYear: number | null;
  endYear: number | null;
  description: string;
  fingerprint: string;
}

/**
 * Parsed LinkedIn profile career role entry
 */
export interface ParsedLinkedinRole {
  company: string;
  title: string;
  location: string;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  description: string;
  fingerprint: string;
}

/**
 * Parsed LinkedIn profile certification entry
 */
export interface ParsedLinkedinCertification {
  name: string;
  issuer: string;
  issueDate: string | null;
  expirationDate: string | null;
  credentialId: string;
  url: string;
  fingerprint: string;
}

/**
 * Parameters for inserting a claim
 */
export interface InsertClaimParams {
  ProjectID: number;
  PersonID: number;
  ClaimType: string;
  GroupKey: string | null;
  ValueJson: any;
  Confidence: number;
  ObservedAt: Date | null;
  ValidFrom: Date | null;
  ValidTo: Date | null;
  SourceDocumentID: number;
  ModuleRunID: number;
  SchemaVersion: string;
}

/**
 * Parameters for creating a layer snapshot
 */
export interface CreateSnapshotParams {
  ProjectID: number;
  PersonID: number;
  LayerNumber: number;
  ComposerModuleKey: string;
  ComposerVersion: string;
  CompiledJson: any;
  GeneratedAt: Date;
  ModuleRunID: number;
}
