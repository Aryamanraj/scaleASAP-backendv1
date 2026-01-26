/**
 * Prospect Search Connector Input Interface
 */

import { SCRAPER_PROVIDER } from '../types/scraper.types';

export interface ProspectSearchConnectorInput {
  provider: SCRAPER_PROVIDER;
  payload: any;
  maxPages?: number;
  maxItems?: number;
  dedupeKey?: string;
  isEnrichProfiles?: boolean;
}
