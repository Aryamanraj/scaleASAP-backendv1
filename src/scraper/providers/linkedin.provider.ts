/**
 * LinkedIn Scraper Provider
 * Calls the local LinkedIn scraper server
 */

import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { fetch } from 'undici';
import { ResultWithError } from '../../common/interfaces';
import {
  ScrapeProfileRequest,
  ScrapeProfileResponse,
} from '../../common/interfaces/linkedin-scraper.interfaces';

@Injectable()
export class LinkedinProvider {
  private baseUrl: string;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private configService: ConfigService,
  ) {
    this.baseUrl =
      this.configService.get<string>('LINKEDIN_SCRAPER_BASE_URL') ||
      'http://localhost:3000';
  }

  async scrapeProfiles(
    request: ScrapeProfileRequest,
  ): Promise<ResultWithError> {
    try {
      const url = `${this.baseUrl.replace(/\/$/, '')}/api/scrape/profile`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(
          `LinkedinProvider.scrapeProfiles: HTTP ${response.status} ${response.statusText}`,
        );
      }

      const data = (await response.json()) as ScrapeProfileResponse;
      return { error: null, data };
    } catch (error) {
      this.logger.error(
        `LinkedinProvider.scrapeProfiles: Error - ${error.stack}`,
      );
      return { error: error, data: null };
    }
  }
}
