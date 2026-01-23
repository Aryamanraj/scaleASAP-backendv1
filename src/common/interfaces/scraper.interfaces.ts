/**
 * Scraper Interfaces
 */

import { SCRAPER_PROVIDER, SCRAPER_TASK_TYPE } from '../types/scraper.types';

/**
 * Base scraper request configuration
 */
export interface ScraperRequest {
  provider: SCRAPER_PROVIDER;
  taskType?: SCRAPER_TASK_TYPE | string;
  payload?: any;
  options?: ScraperOptions;
}

/**
 * Scraper options
 */
export interface ScraperOptions {
  timeout?: number;
  maxRetries?: number;
  [key: string]: any;
}

/**
 * Base scraper response
 */
export interface ScraperResponse<T = any> {
  data: T;
  provider: SCRAPER_PROVIDER;
  taskType: SCRAPER_TASK_TYPE;
  itemsRetrieved: number;
  metadata?: Record<string, any>;
}

/**
 * Search request configuration
 */
export interface SearchRequest {
  provider: SCRAPER_PROVIDER;
  payload: any;
  options?: SearchOptions;
}

/**
 * Search options
 */
export interface SearchOptions {
  maxPages?: number;
  maxItems?: number;
  pageSizeOverride?: number;
  enrichProfiles?: boolean;
}

/**
 * Search response with pagination
 */
export interface SearchResponse<T = any> {
  items: T[];
  pagesFetched: number;
  total: number;
  totalRelation: string;
  queryId: string;
  lastScrollToken: string;
}
