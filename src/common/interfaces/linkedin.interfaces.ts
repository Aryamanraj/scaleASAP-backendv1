/**
 * LinkedIn Connector Interfaces
 */

export interface LinkedinProfileConnectorInput {
  profileUrl: string;
  actorId?: string;
  actorInput?: any;
  limit?: number;
}

export interface LinkedinPostsConnectorInput {
  profileUrl: string;
  actorId?: string;
  actorInput?: any;
  limit?: number;
  totalPosts?: number;
}

export interface WriteLinkedinDocumentParams {
  projectId: number;
  personId: number;
  documentType: string;
  sourceRef: string;
  storageUri: string;
  payloadJson: any;
  moduleRunId: number;
  metaJson?: any;
}

/**
 * LinkedIn Profile Payload Parsing Interfaces
 */
export interface LinkedinBasicInfo {
  fullname?: string;
  fullName?: string;
  full_name?: string;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  location?: LinkedinLocation | string;
  headline?: string;
  summary?: string;
}

export interface LinkedinLocation {
  full?: string;
  city?: string;
  country?: string;
  country_code?: string;
  countryCode?: string;
}

export interface LinkedinEducationItem {
  schoolName?: string;
  school?: string;
  institution?: string;
  degreeName?: string;
  degree?: string;
  fieldOfStudy?: string;
  field?: string;
  dateRange?: {
    start?: { year?: number; month?: number };
    end?: { year?: number; month?: number };
  };
  startYear?: number;
  endYear?: number;
  description?: string;
}

export interface LinkedinExperienceItem {
  companyName?: string;
  company?: string;
  title?: string;
  location?: string;
  dateRange?: {
    start?: { year?: number; month?: number };
    end?: { year?: number; month?: number };
  };
  startDate?: string | { year?: number; month?: number };
  endDate?: string | { year?: number; month?: number };
  isCurrent?: boolean;
  description?: string;
}

export interface LinkedinCertificationItem {
  name?: string;
  certificationName?: string;
  authority?: string;
  issuer?: string;
  dateRange?: {
    start?: { year?: number; month?: number };
    end?: { year?: number; month?: number };
  };
  date?: string | { year?: number; month?: number };
  licenseNumber?: string;
  credentialId?: string;
  url?: string;
}
