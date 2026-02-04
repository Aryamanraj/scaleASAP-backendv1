/**
 * Scraper Service
 * Centralized service for all web scraping operations
 * All methods return ResultWithError for proper error handling
 */

import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { FindOptionsWhere } from 'typeorm';
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
import { LinkedinProvider } from './providers/linkedin.provider';
import {
  BatchResult,
  ProfileData,
  ScrapeProfileRequest,
  ScrapeProfileResponse,
} from '../common/interfaces/linkedin-scraper.interfaces';
import {
  extractLinkedinUsername,
  safeNormalizeLinkedinUrl,
  isLinkedinProfileUrl,
} from '../common/helpers/linkedinUrl';
import { PersonRepoService } from '../repo/person-repo.service';
import { Person } from '../repo/entities/person.entity';

@Injectable()
export class ScraperService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private prospectProvider: ProspectProvider,
    private linkedinProvider: LinkedinProvider,
    private personRepoService: PersonRepoService,
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

  /**
   * Scrape LinkedIn profiles via local scraper server and upsert Persons
   */
  async scrapeLinkedinProfiles(
    request: ScrapeProfileRequest,
  ): Promise<ResultWithError> {
    try {
      const urlsCount = request.urls?.length || 0;
      this.logger.info(
        `ScraperService.scrapeLinkedinProfiles: Starting [urls=${urlsCount}]`,
      );

      const response = await Promisify<ScrapeProfileResponse>(
        this.linkedinProvider.scrapeProfiles(request),
      );

      await this.upsertPersonsFromLinkedinResponse(response);

      const totalCount = response.summary?.total || 0;
      this.logger.info(
        `ScraperService.scrapeLinkedinProfiles: Completed [success=${response.success}, total=${totalCount}]`,
      );

      return { error: null, data: response };
    } catch (error) {
      this.logger.error(
        `ScraperService.scrapeLinkedinProfiles: Error - ${error.stack}`,
      );
      return { error: error, data: null };
    }
  }

  /**
   * Upsert Persons based on LinkedIn scraper results
   */
  private async upsertPersonsFromLinkedinResponse(
    response: ScrapeProfileResponse,
  ): Promise<void> {
    if (!response?.results || response.results.length === 0) {
      return;
    }

    for (const result of response.results) {
      if (!result?.success || !result.data) {
        continue;
      }

      await this.upsertPersonFromProfile(result);
    }
  }

  private async upsertPersonFromProfile(result: BatchResult): Promise<void> {
    const profile = result.data as ProfileData;

    const normalizedUrl = this.resolveNormalizedLinkedinUrl(profile, result);
    const externalUrn =
      profile.profileUrn ||
      (result.url?.startsWith('urn:li:') ? result.url : null);

    if (!normalizedUrl && !externalUrn) {
      this.logger.warn(
        `ScraperService.upsertPersonFromProfile: Missing LinkedIn URL/URN [url=${result.url}]`,
      );
      return;
    }

    const whereConditions: Array<FindOptionsWhere<Person>> = [];
    if (normalizedUrl) {
      whereConditions.push({ LinkedinUrl: normalizedUrl });
    }
    if (externalUrn) {
      whereConditions.push({ ExternalUrn: externalUrn });
    }

    const existingPerson = await Promisify<Person | null>(
      this.personRepoService.get({ where: whereConditions }, false),
    );

    const displayName = profile.fullName
      ? profile.fullName
      : [profile.firstName, profile.lastName].filter(Boolean).join(' ') || null;

    const updateData: Partial<Person> = {};
    if (normalizedUrl && existingPerson?.LinkedinUrl !== normalizedUrl) {
      updateData.LinkedinUrl = normalizedUrl;
    }

    const linkedinSlug = normalizedUrl
      ? extractLinkedinUsername(normalizedUrl)
      : null;
    if (linkedinSlug && existingPerson?.LinkedinSlug !== linkedinSlug) {
      updateData.LinkedinSlug = linkedinSlug;
    }

    if (externalUrn && existingPerson?.ExternalUrn !== externalUrn) {
      updateData.ExternalUrn = externalUrn;
    }

    if (profile.firstName && existingPerson?.FirstName !== profile.firstName) {
      updateData.FirstName = profile.firstName;
    }

    if (profile.lastName && existingPerson?.LastName !== profile.lastName) {
      updateData.LastName = profile.lastName;
    }

    if (displayName && existingPerson?.PrimaryDisplayName !== displayName) {
      updateData.PrimaryDisplayName = displayName;
    }

    if (profile.headline && existingPerson?.Headline !== profile.headline) {
      updateData.Headline = profile.headline;
    }

    if (existingPerson) {
      if (Object.keys(updateData).length === 0) {
        this.logger.info(
          `ScraperService.upsertPersonFromProfile: No changes needed [personId=${existingPerson.PersonID}]`,
        );
        return;
      }

      await Promisify(
        this.personRepoService.update(
          { PersonID: existingPerson.PersonID },
          updateData,
        ),
      );

      this.logger.info(
        `ScraperService.upsertPersonFromProfile: Updated person [personId=${existingPerson.PersonID}]`,
      );
      return;
    }

    if (!normalizedUrl) {
      this.logger.warn(
        `ScraperService.upsertPersonFromProfile: Cannot create person without LinkedinUrl [urn=${externalUrn}]`,
      );
      return;
    }

    await Promisify<Person>(
      this.personRepoService.create({
        LinkedinUrl: normalizedUrl,
        LinkedinSlug: linkedinSlug,
        ExternalUrn: externalUrn || null,
        PrimaryDisplayName: displayName || null,
        FirstName: profile.firstName || null,
        LastName: profile.lastName || null,
        Headline: profile.headline || null,
      }),
    );

    this.logger.info(
      `ScraperService.upsertPersonFromProfile: Created person [linkedinUrl=${normalizedUrl}]`,
    );
  }

  private resolveNormalizedLinkedinUrl(
    profile: ProfileData,
    result: BatchResult,
  ): string | null {
    const fromProfile = safeNormalizeLinkedinUrl(profile.profileUrl);
    if (fromProfile) {
      return fromProfile;
    }

    const fromResultUrl = isLinkedinProfileUrl(result.url)
      ? safeNormalizeLinkedinUrl(result.url)
      : null;
    if (fromResultUrl) {
      return fromResultUrl;
    }

    if (profile.publicIdentifier) {
      return safeNormalizeLinkedinUrl(
        `https://linkedin.com/in/${profile.publicIdentifier}`,
      );
    }

    return null;
  }
}
