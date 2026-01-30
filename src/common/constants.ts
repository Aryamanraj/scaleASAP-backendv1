export const QueueNames = {
  NEW_LOGS: 'new-logs', // handle web3 interaction logs updates
  LATE_LOGS: 'late-logs', //handle late log web3 interactions
  MODULE_RUNS: 'module-runs', // handle module run executions
  // New queues for frontend-v1 migration
  DISCOVERY: 'discovery', // handle discovery chat and experiment generation
  OUTREACH: 'outreach', // handle outreach message generation
  LEAD_ENRICHMENT: 'lead-enrichment', // handle lead enrichment via Wiza
  WEBSITE_SCRAPER: 'website-scraper', // handle website scraping and analysis
  CAMPAIGN_SCALE: 'campaign-scale', // handle campaign scaling operations
  DATA_EXPORT: 'data-export', // handle data export jobs
};

// list of queues
export const Queues = [
  QueueNames.NEW_LOGS,
  QueueNames.LATE_LOGS,
  QueueNames.MODULE_RUNS,
  QueueNames.DISCOVERY,
  QueueNames.OUTREACH,
  QueueNames.LEAD_ENRICHMENT,
  QueueNames.WEBSITE_SCRAPER,
  QueueNames.CAMPAIGN_SCALE,
  QueueNames.DATA_EXPORT,
];

export const QUEUE_JOB_NAMES = {
  PONG_TRANSACTION: 'pong-queue', //job name for sending pong
  LATE_PONG_TRANSACTION: 'late-pong-queue', //job name for sending pong
  EXECUTE_MODULE_RUN: 'execute-module-run', //job name for executing module runs
  // New job names for frontend-v1 migration
  DISCOVERY_CHAT: 'discovery-chat',
  GENERATE_EXPERIMENTS: 'generate-experiments',
  LEAD_ENRICHMENT: 'lead-enrichment',
  BULK_LEAD_ENRICHMENT: 'bulk-lead-enrichment',
  GENERATE_OUTREACH: 'generate-outreach',
  BULK_GENERATE_OUTREACH: 'bulk-generate-outreach',
  WEBSITE_SCRAPE: 'website-scrape',
  CAMPAIGN_SCALE: 'campaign-scale',
  DATA_EXPORT: 'data-export',
  WIZA_SEARCH: 'wiza-search',
};

export const CRON_JOB_NAMES = {
  CRONS_HEALTH_CHECKER: 'crons-health-checker',
  LATE_SEND_PONG: 'late-send-pong-cron',
};

export const CUTOFF_TIME = 10 * 60; // 10 mintues
