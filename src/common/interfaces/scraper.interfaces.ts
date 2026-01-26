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

//////////////////////////////////////////////////////////////
///// prospect-search-connector module response types start
//////////////////////////////////////////////////////////////
/** Common primitives */
export type Provider = 'PROSPECT' | string;
export type HttpStatusCode = number;

export interface DateParts {
  day: number | null;
  month: number | null;
  year: number | null;
}

export interface DateRangeParts {
  start: DateParts;
  end: DateParts;
}

export interface LogoRef {
  url: string | null;
  logo: string | null;
  name: string;
  id?: number | null;
}

export interface LocationInfo {
  short: string;
  country: string;
  default: string;
}

export type Skill = string;

export interface ProfileLanguage {
  name: string;
  proficiency: string; // e.g. FULL_PROFESSIONAL, NATIVE_OR_BILINGUAL
}

export interface ProfileLanguagesBlock {
  profile_languages?: ProfileLanguage[];
  // your sample has {} sometimes, so keep it permissive
  [k: string]: unknown;
}

/** Preview block */
export interface PreviewCompany {
  name: string;
  size: number;
  domain: string;
  founded: number | null;
  industry: string;
  location: string;
  logo_url: string;
  size_range: string;
  description: string;
}

export interface PreviewContact {
  masked_email: string;
  masked_phone: string;
}

export interface PreviewPayload {
  status: HttpStatusCode;
  company: PreviewCompany;
  contact: PreviewContact;
}

/** Profile block */
export interface ProfileEducation {
  date: DateRangeParts;
  school: {
    url: string | null;
    logo: string | null;
    name: string;
  };
  degree_name: string | null;
  description: string | null;
  field_of_study: string | null;
}

export interface ProfilePosition {
  date: DateRangeParts;
  title: string;
  company: string;
  location: string | null;
  description: string | null;
  employment_type: string | null;
}

export interface ProfilePositionGroup {
  date: DateRangeParts;
  company: {
    id: number | null;
    url: string | null;
    logo: string | null;
    name: string;
  };
  profile_positions: ProfilePosition[];
}

export interface EnrichedProfile {
  cached: boolean;
  skills: Skill[];
  premium: boolean;
  summary: string | null;
  industry: string | null;
  location: LocationInfo;
  education: ProfileEducation[];
  languages: ProfileLanguagesBlock;
  last_name: string;
  sub_title: string | null;
  birth_date: string | null;
  entity_urn: string | null;
  first_name: string;
  influencer: boolean | null;
  object_urn: number | null;
  profile_id: string | null;
  open_to_work: boolean | null;
  certifications: unknown[]; // sample is []
  job_company_id: string | null;
  position_groups: ProfilePositionGroup[];
  profile_picture: string | null;
  background_image: string | null;

  // duplicates at top-level in sample's profile
  job_company_name?: string | null;
  job_company_size?: string | null;
  job_company_type?: string | null;
  sourced_person_id?: number | null;
  job_company_founded?: number | null;
  job_company_website?: string | null;
  job_company_industry?: string | null;
  job_company_linkedin_id?: string | null;
  job_company_display_name?: string | null;
  job_company_linkedin_slug?: string | null;
  job_company_location_name?: string | null;
  job_company_inferred_revenue?: string | null;
  job_company_total_funding_raised?: string | null;
}

/** Enriched wrapper */
export interface EnrichedBlock {
  preview: PreviewPayload;
  profile: EnrichedProfile;
  prospect: unknown | null;
}

/** Item */
export interface SearchItem {
  id: string;

  enriched: EnrichedBlock;

  industry: string | null;
  full_name: string;
  job_title: string;
  linkedin_id: string;
  linkedin_url: string;
  linkedin_slug: string;

  profile_code: string;
  profile_code_id: string;

  location_name: string;

  job_company_id: string;
  job_company_name: string;
  job_company_website: string | null;

  job_company_linkedin_id: string | null;
  job_company_linkedin_url: string | null;

  job_company_location_name: string | null;

  job_company_size: string | null; // like "1-10"
  job_company_type: string | null;
  job_company_founded: number | null;

  job_company_industry: string | null;
  job_company_inferred_revenue: string | null;
  job_company_total_funding_raised: string | null;

  job_title_role: string | null;
  job_title_sub_role: string | null;
  job_title_levels: string[]; // e.g. ["CXO", "Owner"]
}

/** Input shape */
export interface SearchQueryPayload {
  query: {
    job_title?: string[];
    // allow future filters without changing types
    [k: string]: unknown;
  };
}

export interface SearchInput {
  payload: SearchQueryPayload;
  maxItems: number;
  maxPages: number;
  dedupeKey: string;
}

/** Result shape */
export interface SearchResult {
  items: SearchItem[];
  total: number;
  queryId: string;
  pagesFetched: number;
  totalRelation: 'gte' | 'eq' | string;
  lastScrollToken: string | null;
}

/** Full response */
export interface ProspectSearchResponse {
  input: SearchInput;
  result: SearchResult;
  provider: Provider;
}
//////////////////////////////////////////////////////////////
///// prospect-search-connector module response types ends
//////////////////////////////////////////////////////////////
