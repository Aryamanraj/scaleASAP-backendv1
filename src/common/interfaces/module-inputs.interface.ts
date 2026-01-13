/**
 * Module Input Configurations
 * Defines the expected shape of InputConfigJson for different module types
 */

export interface ManualDocumentConnectorInput {
  source: string; // DocumentSource.MANUAL
  contentType: string;
  documentKind: string; // DocumentKind enum value
  payload: any;
  capturedAt?: string; // ISO date string
}

export interface CoreIdentityEnricherInput {
  documentSource?: string; // default 'MANUAL'
  documentKind: string; // DocumentKind enum value (e.g., 'LINKEDIN_PROFILE')
  schemaVersion: string;
}

export interface Layer1ComposerInput {
  layerNumber?: number; // default 1
  schemaVersion: string;
}

/**
 * Core Identity Payload Structure
 * Expected structure in Document payload for manual documents
 */
export interface CoreIdentityPayload {
  legalName?: string;
  location?: string;
  education?: Array<{
    school: string;
    degree: string;
    field?: string;
    startYear?: number;
    endYear?: number;
  }>;
  career?: Array<{
    company: string;
    title: string;
    startDate?: string;
    endDate?: string;
  }>;
  certifications?: Array<{
    name: string;
    issuer?: string;
    year?: number;
  }>;
}
