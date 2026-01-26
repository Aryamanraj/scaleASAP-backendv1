/**
 * Prospect Provider Implementation
 * Web scraping provider for prospect/lead search APIs
 * All methods return ResultWithError for proper error handling
 */

import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ConfigService } from '@nestjs/config';
import { ResultWithError } from '../../common/interfaces';
import { Promisify } from '../../common/helpers/promisifier';
import { ScraperProvider } from './scraper-provider.interface';
import {
  ScraperRequest,
  ScraperResponse,
  SearchRequest,
  SearchResponse,
} from '../../common/interfaces/scraper.interfaces';
import { HttpManager } from '../managers/http.manager';
import { SessionManager } from '../managers/session.manager';
import { AuthManager } from '../managers/auth.manager';
import { SCRAPER_CONFIG } from '../scraper.config';

/**
 * Query field value with search modifiers
 */
interface QueryFieldValue {
  v: string;
  s?: 'i' | 'e'; // 'i' = include, 'e' = exclude
  b?: string; // boundary (e.g., 'city')
  t?: 'last' | 'any'; // time modifier
}

/**
 * Funding date filter
 */
interface FundingDateFilter {
  t: 'last' | 'any';
  v: string; // e.g., '60d'
}

/**
 * Funding stage/type filter
 */
interface FundingFilter {
  t: 'last' | 'any';
  v: string[];
}

/**
 * Search query structure
 */
interface SearchQuery {
  first_name?: string[];
  last_name?: string[];
  job_title?: Array<string | QueryFieldValue>;
  job_title_level?: string[];
  job_role?: string[];
  job_sub_role?: string[];
  location?: QueryFieldValue;
  skill?: string[];
  school?: string[];
  major?: string[];
  linkedin_slug?: string[];
  job_company?: Array<string | QueryFieldValue>;
  past_company?: Array<string | QueryFieldValue>;
  company_location?: Array<string | QueryFieldValue>;
  company_industry?: Array<string | QueryFieldValue>;
  company_size?: string[];
  company_annual_growth?: string;
  department_size?: string[];
  revenue?: string[];
  funding_date?: FundingDateFilter;
  last_funding_min?: string;
  last_funding_max?: string;
  funding_min?: string;
  funding_max?: string;
  funding_stage?: FundingFilter;
  funding_type?: FundingFilter;
  company_type?: string[];
  company_summary?: Array<string | QueryFieldValue>;
  year_founded_start?: string;
  year_founded_end?: string;
  [key: string]: any; // Allow additional fields
}

/**
 * Search payload structure
 */
interface SearchPayload {
  query?: SearchQuery;
  scroll_token?: string;
  sort_fields?: string[];
  search_after?: string[] | null;
  page_size?: number;
  [key: string]: any;
}

/**
 * Prospect item structure from API response
 */
interface ProspectItem {
  id: string;
  full_name: string;
  industry: string | null;
  job_company_name: string;
  job_company_website: string | null;
  job_title: string;
  linkedin_url: string;
  location_name: string;
  profile_code: string;
  profile_code_id: string;
  job_title_levels: string[];
  job_title_role: string | null;
  job_title_sub_role: string | null;
  job_company_size: string | null;
  job_company_industry: string | null;
  job_company_founded: string | null;
  job_company_type: string | null;
  job_company_inferred_revenue: string | null;
  job_company_total_funding_raised: string | null;
  job_company_location_name: string | null;
  linkedin_id: string;
  linkedin_slug: string;
  job_company_linkedin_id: string | null;
  job_company_linkedin_url: string | null;
  job_company_id: string | null;
  [key: string]: any; // Allow additional fields
}

/**
 * API response body structure
 */
interface SearchApiResponseBody {
  cached_total: boolean;
  data: ProspectItem[];
  last_sort: string[];
  query: SearchQuery;
  query_id: string;
  scroll_token: string;
  sort_fields: string[];
  total: number;
  total_relation: 'eq' | 'gte';
}

/**
 * Full API response structure
 */
interface SearchApiResponse {
  status: number;
  body: SearchApiResponseBody;
}

/**
 * Profile API response structure from GET /svc/app/prospect/profile
 */
interface ProfileApiResponse {
  status: number;
  data: {
    profile: any; // Contains skills, education, position_groups, certifications, languages
    prospect: any; // Prospect summary data
    preview: any; // Preview data
  };
}

@Injectable()
export class ProspectProvider implements ScraperProvider {
  private http: HttpManager;
  private session: SessionManager;
  private auth: AuthManager | null = null;
  private sessionInitialized = false;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private configService: ConfigService,
  ) {
    this.initializeClient();
  }

  /**
   * Initialize the HTTP client with session and auth
   */
  private initializeClient(): void {
    const baseUrl = this.configService.get<string>('PROSPECT_BASE_URL');
    if (!baseUrl) {
      throw new Error('PROSPECT_BASE_URL not found in environment variables');
    }

    const sessionFile =
      this.configService.get<string>('PROSPECT_SESSION_FILE') ||
      SCRAPER_CONFIG.SESSION_FILE_PATH;

    this.session = new SessionManager(sessionFile, this.logger);

    // Initialize auth if credentials are provided
    const username = this.configService.get<string>('PROSPECT_USERNAME');
    const password = this.configService.get<string>('PROSPECT_PASSWORD');

    if (username && password) {
      this.auth = new AuthManager(
        baseUrl,
        {
          mode: 'json',
          loginPath: SCRAPER_CONFIG.AUTH_LOGIN_PATH,
          usernameField: 'email',
          passwordField: 'password',
          additionalFields: {
            redirect_url: '/app',
            trial_token: null,
          },
          credentials: { username, password },
        },
        this.session,
        this.logger,
      );
    }

    // Initialize HTTP client
    this.http = new HttpManager(
      baseUrl,
      this.session,
      this.auth,
      {
        'User-Agent': SCRAPER_CONFIG.USER_AGENT,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      {
        maxRetries: SCRAPER_CONFIG.DEFAULT_MAX_RETRIES,
        baseDelayMs: SCRAPER_CONFIG.DEFAULT_BASE_DELAY_MS,
      },
      {
        concurrency: SCRAPER_CONFIG.DEFAULT_CONCURRENCY,
        intervalMs: SCRAPER_CONFIG.DEFAULT_INTERVAL_MS,
      },
      this.logger,
    );
  }

  /**
   * Ensure session is loaded
   */
  private async ensureSession(): Promise<void> {
    if (this.sessionInitialized) {
      return;
    }
    await Promisify<boolean>(this.session.load());
    this.sessionInitialized = true;
  }

  /**
   * Get profile details for a prospect
   */
  async getProfile(profileCode: string): Promise<ResultWithError> {
    try {
      this.logger.debug(
        `ProspectProvider.getProfile: Fetching profile [profileCode=${profileCode}]`,
      );

      const response = await Promisify<ProfileApiResponse>(
        this.http.get<ProfileApiResponse>(
          `${SCRAPER_CONFIG.PROFILE_PATH}?profile_code=${profileCode}`,
        ),
      );

      return { error: null, data: response };
    } catch (error) {
      this.logger.error(
        `ProspectProvider.getProfile: Error fetching profile - ${error.stack}`,
      );
      return { error: error, data: null };
    }
  }

  /**
   * Enrich a single item with profile data
   */
  private async enrichItem(item: any): Promise<any> {
    try {
      const profileCode = item.profile_code;
      if (!profileCode) {
        this.logger.warn(
          `ProspectProvider.enrichItem: Item missing profile_code, skipping enrichment [id=${item.id}]`,
        );
        return item;
      }

      const profileResult = await this.getProfile(profileCode);
      if (profileResult.error || !profileResult.data) {
        this.logger.warn(
          `ProspectProvider.enrichItem: Failed to fetch profile, returning original item [profileCode=${profileCode}, error=${profileResult.error?.message}]`,
        );
        return item;
      }

      // Add enriched data to the item
      return {
        ...item,
        enriched: profileResult.data.data,
      };
    } catch (error) {
      this.logger.error(
        `ProspectProvider.enrichItem: Error enriching item - ${error.stack}`,
      );
      return item; // Return original item on error
    }
  }

  /**
   * Execute a generic scraper request
   */
  async scrape(request: ScraperRequest): Promise<ResultWithError> {
    try {
      await this.ensureSession();

      this.logger.info(
        `ProspectProvider.scrape: Executing scraper request [taskType=${request.taskType}]`,
      );

      // Generic scraping logic - can be extended based on taskType
      throw new Error(
        'Generic scrape not yet implemented for ProspectProvider',
      );
    } catch (error) {
      this.logger.error(`ProspectProvider.scrape: Error - ${error.stack}`);
      return { error: error, data: null };
    }
  }

  /**
   * Execute a search request with pagination
   */
  async search(request: SearchRequest): Promise<ResultWithError> {
    try {
      await this.ensureSession();

      const { payload, options = {} } = request;
      const {
        maxPages = Infinity,
        maxItems = Infinity,
        pageSizeOverride,
        enrichProfiles = false,
      } = options;

      this.logger.info(
        `ProspectProvider.search: Starting search [maxPages=${maxPages}, maxItems=${maxItems}, enrichProfiles=${enrichProfiles}]`,
      );

      // Apply page size override if provided
      const initialPayload: SearchPayload = pageSizeOverride
        ? { ...payload, page_size: pageSizeOverride }
        : payload;

      const allItems: any[] = [];
      let pagesFetched = 0;
      let currentPayload = initialPayload;
      let lastResponse: SearchApiResponse | null = null;

      while (pagesFetched < maxPages && allItems.length < maxItems) {
        const response = await Promisify<SearchApiResponse>(
          this.http.post<SearchApiResponse>(
            SCRAPER_CONFIG.SEARCH_PATH,
            currentPayload,
          ),
        );

        lastResponse = response;
        const items = response.body.data;

        if (!items || items.length === 0) {
          this.logger.info(
            `ProspectProvider.search: No more items available [pagesFetched=${pagesFetched}]`,
          );
          break;
        }

        // Add items up to maxItems limit
        const remainingSlots = maxItems - allItems.length;
        let itemsToAdd = items.slice(0, remainingSlots);

        // Enrich profiles if requested
        if (enrichProfiles) {
          this.logger.info(
            `ProspectProvider.search: Enriching profiles [count=${itemsToAdd.length}]`,
          );
          itemsToAdd = await Promise.all(
            itemsToAdd.map((item) => this.enrichItem(item)),
          );
        }

        allItems.push(...itemsToAdd);

        pagesFetched++;

        // Check if we're done
        if (allItems.length >= maxItems) {
          break;
        }

        // Build next page payload
        currentPayload = this.buildNextPagePayload(currentPayload, response);
      }

      this.logger.info(
        `ProspectProvider.search: Search completed [pagesFetched=${pagesFetched}, totalItems=${allItems.length}]`,
      );

      const searchResponse: SearchResponse = {
        items: allItems,
        pagesFetched,
        total: lastResponse?.body.total || 0,
        totalRelation: lastResponse?.body.total_relation || 'eq',
        queryId: lastResponse?.body.query_id || '',
        lastScrollToken: lastResponse?.body.scroll_token || '',
      };

      return { error: null, data: searchResponse };
    } catch (error) {
      this.logger.error(`ProspectProvider.search: Error - ${error.stack}`);
      return { error: error, data: null };
    }
  }

  /**
   * Build the next page payload by merging pagination fields
   */
  private buildNextPagePayload(
    originalPayload: SearchPayload,
    previousResponse: SearchApiResponse,
  ): SearchPayload {
    const { scroll_token, sort_fields, last_sort } = previousResponse.body;

    return {
      ...originalPayload,
      scroll_token,
      sort_fields,
      search_after: last_sort,
    };
  }
}
