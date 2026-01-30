/**
 * AI Prompts Index
 * Central export for all AI prompts used in the application.
 */

// Discovery prompts
export {
  getDiscoverySystemPrompt,
  getDiscoverySystemPromptSync,
  parseExperimentsFromResponse,
  type DiscoveryPromptContext,
} from './discovery/orchestrator';

// Outreach prompts
export {
  OUTREACH_SYSTEM_PROMPT,
  getOutreachUserPrompt,
} from './outreach/system';

// Scrape cleanup prompts
export {
  SCRAPE_CLEANUP_PROMPT,
  getScrapeCleanupPrompt,
} from './scrape/cleanup';

// Worldview prompts
export {
  WORLDVIEW_GENERATION_PROMPT,
  getWorldviewPrompt,
} from './worldview/generation';
