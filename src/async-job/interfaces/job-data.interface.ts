/**
 * Job Data Interfaces
 * Defines the structure for all async job data stored in Redis via Bull.
 */

import { AsyncJobType } from '../../common/constants/entity.constants';

/**
 * Base interface for all async job data stored in Redis.
 */
export interface BaseJobData {
  projectId: number;
  userId: number;
  jobType: AsyncJobType;
  // Progress tracking fields (stored in job.data, updated via job.updateData())
  totalSteps: number;
  completedSteps: number;
  currentStep: string;
  startedAt?: string; // ISO string
  // Result fields (populated on completion/failure)
  output?: object;
  errorMessage?: string;
  errorDetails?: object;
}

/**
 * Lead enrichment job data.
 */
export interface LeadEnrichmentJobData extends BaseJobData {
  leadIds: number[];
}

/**
 * Bulk lead enrichment job data.
 */
export interface BulkLeadEnrichmentJobData extends BaseJobData {
  leadIds: number[];
  campaignId?: number;
}

/**
 * Discovery chat job data.
 */
export interface DiscoveryChatJobData extends BaseJobData {
  conversationId: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  context: {
    userName: string;
    companyName: string;
    worldview: string;
    website: string;
    turnCount: number;
  };
}

/**
 * Generate experiments job data.
 */
export interface GenerateExperimentsJobData extends BaseJobData {
  discoverySessionId: number;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/**
 * Outreach generation job data.
 */
export interface OutreachJobData extends BaseJobData {
  leadIds: number[];
  experimentId?: number;
  templateId?: number;
}

/**
 * Bulk outreach generation job data.
 */
export interface BulkOutreachJobData extends BaseJobData {
  leadIds: number[];
  campaignId: number;
  experimentId?: number;
}

/**
 * Website scrape job data.
 */
export interface WebsiteScrapeJobData extends BaseJobData {
  url: string;
  depth?: number;
}

/**
 * Campaign scale job data.
 */
export interface CampaignScaleJobData extends BaseJobData {
  campaignId: number;
  targetLeadCount: number;
  experimentId?: number;
}

/**
 * Wiza search job data.
 */
export interface WizaSearchJobData extends BaseJobData {
  campaignId: number;
  experimentId: number;
  wizaFilters: object;
  maxResults?: number;
}

/**
 * Data export job data.
 */
export interface DataExportJobData extends BaseJobData {
  exportType: 'leads' | 'campaigns' | 'experiments';
  filters?: object;
  format: 'csv' | 'json';
}

/**
 * Union type for all job data types.
 */
export type JobData =
  | LeadEnrichmentJobData
  | BulkLeadEnrichmentJobData
  | DiscoveryChatJobData
  | GenerateExperimentsJobData
  | OutreachJobData
  | BulkOutreachJobData
  | WebsiteScrapeJobData
  | CampaignScaleJobData
  | WizaSearchJobData
  | DataExportJobData;
