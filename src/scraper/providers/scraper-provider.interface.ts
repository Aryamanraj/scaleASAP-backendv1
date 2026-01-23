/**
 * Scraper Provider Interface
 * All scraper providers must implement this interface
 * All methods return ResultWithError for proper error handling
 */

import { ResultWithError } from '../../common/interfaces';
import {
  ScraperRequest,
  SearchRequest,
} from '../../common/interfaces/scraper.interfaces';

export interface ScraperProvider {
  /**
   * Execute a scraper request
   * @param request - The scraper request configuration
   * @returns ResultWithError containing ScraperResponse
   */
  scrape(request: ScraperRequest): Promise<ResultWithError>;

  /**
   * Execute a search request
   * @param request - The search request configuration
   * @returns ResultWithError containing SearchResponse
   */
  search(request: SearchRequest): Promise<ResultWithError>;
}
