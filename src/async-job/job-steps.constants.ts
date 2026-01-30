/**
 * Job Steps Constants
 * Defines the steps for each async job type for accurate progress tracking.
 */

import { AsyncJobType } from '../common/constants/entity.constants';

interface JobStepDefinition {
  steps: string[];
  totalSteps: number;
  dynamic?: boolean;
}

/**
 * Step definitions for each async job type.
 * Used to calculate accurate progress percentages.
 */
export const JOB_STEPS: Record<string, JobStepDefinition> = {
  [AsyncJobType.DISCOVERY_CHAT]: {
    steps: [
      'Analyzing company context',
      'Generating ICP hypotheses',
      'Refining target personas',
      'Creating experiment recommendations',
      'Finalizing response',
    ],
    totalSteps: 5,
  },

  [AsyncJobType.GENERATE_EXPERIMENTS]: {
    steps: [
      'Parsing discovery output',
      'Validating ICP patterns',
      'Generating Wiza filters',
      'Creating experiment records',
      'Saving to database',
    ],
    totalSteps: 5,
  },

  [AsyncJobType.LEAD_ENRICHMENT]: {
    steps: ['Fetching from Wiza', 'Parsing profile data', 'Saving enrichment'],
    totalSteps: 3,
  },

  [AsyncJobType.BULK_LEAD_ENRICHMENT]: {
    // Dynamic: totalSteps = leadIds.length
    steps: [],
    totalSteps: 0,
    dynamic: true,
  },

  [AsyncJobType.GENERATE_OUTREACH]: {
    steps: [
      'Analyzing lead profile',
      'Fetching company context',
      'Generating personalized message',
      'Applying style guidelines',
      'Finalizing draft',
    ],
    totalSteps: 5,
  },

  [AsyncJobType.BULK_GENERATE_OUTREACH]: {
    // Dynamic: totalSteps = leadIds.length
    steps: [],
    totalSteps: 0,
    dynamic: true,
  },

  [AsyncJobType.WEBSITE_SCRAPE]: {
    steps: [
      'Fetching page content',
      'Extracting text',
      'AI cleanup & summarization',
      'Saving results',
    ],
    totalSteps: 4,
  },

  [AsyncJobType.CAMPAIGN_SCALE]: {
    steps: [
      'Analyzing current performance',
      'Calculating optimal scale',
      'Finding new leads',
      'Enriching leads',
      'Generating outreach',
      'Activating scaled campaign',
    ],
    totalSteps: 6,
  },

  [AsyncJobType.WIZA_SEARCH]: {
    steps: [
      'Validating filters',
      'Submitting search request',
      'Polling for results',
      'Parsing lead data',
      'Saving leads',
    ],
    totalSteps: 5,
  },

  [AsyncJobType.DATA_EXPORT]: {
    // Dynamic: depends on record count
    steps: [],
    totalSteps: 0,
    dynamic: true,
  },
};

/**
 * Get the step text for a job at a specific step number.
 */
export function getStepText(jobType: AsyncJobType, stepNumber: number): string {
  const definition = JOB_STEPS[jobType];
  if (!definition || definition.dynamic) {
    return `Processing step ${stepNumber}...`;
  }

  if (stepNumber < 1 || stepNumber > definition.steps.length) {
    return 'Processing...';
  }

  return definition.steps[stepNumber - 1];
}

/**
 * Get total steps for a job type.
 * For dynamic jobs, returns 0 (should be set based on job data).
 */
export function getTotalSteps(jobType: AsyncJobType): number {
  const definition = JOB_STEPS[jobType];
  return definition?.totalSteps || 0;
}

/**
 * Check if a job type has dynamic step count.
 */
export function isDynamicJob(jobType: AsyncJobType): boolean {
  const definition = JOB_STEPS[jobType];
  return definition?.dynamic || false;
}
