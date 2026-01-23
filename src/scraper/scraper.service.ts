/**
 * Scraper Service
 * Centralized service for all web scraping operations
 * All methods return ResultWithError for proper error handling
 */

import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { Promisify } from '../common/helpers/promisifier';
import {
  ScraperRequest,
  ScraperResponse,
  SearchRequest,
  SearchResponse,
} from '../common/interfaces/scraper.interfaces';
import { SCRAPER_PROVIDER } from '../common/types/scraper.types';
import { ProspectProvider } from './providers/prospect.provider';

@Injectable()
export class ScraperService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private prospectProvider: ProspectProvider,
  ) {}

  /**
   * Execute a scraper request
   * Routes to the appropriate provider based on the request
   */
  async scrape<T = any>(request: ScraperRequest): Promise<ResultWithError> {
    try {
      this.logger.info(
        `ScraperService.scrape: Starting scraper request [provider=${request.provider}, taskType=${request.taskType}]`,
      );

      let response: ScraperResponse<T>;

      switch (request.provider) {
        case SCRAPER_PROVIDER.PROSPECT:
          response = await Promisify<ScraperResponse<T>>(
            this.prospectProvider.scrape(request),
          );
          break;
        default:
          throw new Error(`Unsupported scraper provider: ${request.provider}`);
      }

      this.logger.info(
        `ScraperService.scrape: Completed scraper request [provider=${request.provider}, taskType=${request.taskType}, itemsRetrieved=${response.itemsRetrieved}]`,
      );

      return { error: null, data: response };
    } catch (error) {
      this.logger.error(`ScraperService.scrape: Error - ${error.stack}`);
      return { error: error, data: null };
    }
  }

  /**
   * Execute a search request
   * Simplified interface for search operations
   */
  async search<T = any>(request: SearchRequest): Promise<ResultWithError> {
    try {
      this.logger.info(
        `ScraperService.search: Starting search [provider=${
          request.provider
        }, maxPages=${request.options?.maxPages || 'unlimited'}, maxItems=${
          request.options?.maxItems || 'unlimited'
        }]`,
      );

      let response: SearchResponse<T>;

      switch (request.provider) {
        case SCRAPER_PROVIDER.PROSPECT:
          response = await Promisify<SearchResponse<T>>(
            this.prospectProvider.search(request),
          );
          break;
        default:
          throw new Error(`Unsupported scraper provider: ${request.provider}`);
      }

      this.logger.info(
        `ScraperService.search: Completed search [provider=${request.provider}, itemsRetrieved=${response.items.length}, pagesFetched=${response.pagesFetched}]`,
      );

      return { error: null, data: response };
    } catch (error) {
      this.logger.error(`ScraperService.search: Error - ${error.stack}`);
      return { error: error, data: null };
    }
  }
}
