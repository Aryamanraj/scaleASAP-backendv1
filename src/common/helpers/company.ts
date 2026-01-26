/**
 * Company Mapping Helper Functions
 *
 * Utilities for extracting and mapping company/organization data
 * from prospect search response items.
 */

import { SearchItem } from '../interfaces/scraper.interfaces';
import { CompanySizeRange, CompanyType } from '../constants/entity.constants';

/**
 * Mapped company data structure for upsert operations.
 * Matches Organization entity fields.
 */
export interface MappedCompany {
  name: string;
  domain: string | null;
  website: string | null;
  industry: string | null;
  sizeRange: CompanySizeRange | null;
  foundedYear: number | null;
  type: CompanyType | null;
  inferredRevenue: string | null;
  totalFundingRaised: string | null;
  linkedinUrl: string | null;
  linkedinCompanyId: string | null;
  linkedinCompanyUrn: string | null;
  locationDisplayName: string | null;
}

/**
 * Maps a company size string (e.g., "1-10", "11-50") to CompanySizeRange enum.
 *
 * @param sizeStr - Raw size string from prospect data
 * @returns Matching CompanySizeRange or null if not mappable
 */
export function mapCompanySizeRange(
  sizeStr: string | null | undefined,
): CompanySizeRange | null {
  if (!sizeStr) return null;

  const normalized = sizeStr.toLowerCase().trim().replace(/\s+/g, '');

  // Map common variations
  const sizeMap: Record<string, CompanySizeRange> = {
    '1-10': CompanySizeRange.SIZE_1_10,
    '11-50': CompanySizeRange.SIZE_11_50,
    '51-200': CompanySizeRange.SIZE_51_200,
    '201-500': CompanySizeRange.SIZE_201_500,
    '501-1000': CompanySizeRange.SIZE_501_1000,
    '1001-5000': CompanySizeRange.SIZE_1001_5000,
    '5001-10000': CompanySizeRange.SIZE_5001_10000,
    '10001+': CompanySizeRange.SIZE_10001_PLUS,
    '10001-plus': CompanySizeRange.SIZE_10001_PLUS,
    '10000+': CompanySizeRange.SIZE_10001_PLUS,
  };

  return sizeMap[normalized] || null;
}

/**
 * Maps a company type string to CompanyType enum.
 *
 * @param typeStr - Raw type string from prospect data
 * @returns Matching CompanyType or null if not mappable
 */
export function mapCompanyType(
  typeStr: string | null | undefined,
): CompanyType | null {
  if (!typeStr) return null;

  const normalized = typeStr
    .toLowerCase()
    .trim()
    .replace(/[_\s-]+/g, '');

  const typeMap: Record<string, CompanyType> = {
    public: CompanyType.PUBLIC,
    publiccompany: CompanyType.PUBLIC,
    private: CompanyType.PRIVATE,
    privatecompany: CompanyType.PRIVATE,
    privatelyheld: CompanyType.PRIVATE,
    nonprofit: CompanyType.NONPROFIT,
    'non-profit': CompanyType.NONPROFIT,
    government: CompanyType.GOVERNMENT,
    governmentagency: CompanyType.GOVERNMENT,
    educational: CompanyType.EDUCATIONAL,
    educationalinstitution: CompanyType.EDUCATIONAL,
    selfemployed: CompanyType.SELF_EMPLOYED,
    partnership: CompanyType.PARTNERSHIP,
    other: CompanyType.OTHER,
  };

  return typeMap[normalized] || null;
}

/**
 * Extracts domain from a website URL.
 *
 * @param websiteUrl - Full website URL
 * @returns Domain without protocol/www/path, or null
 *
 * @example
 * extractDomainFromWebsite("https://www.example.com/about")
 * // => "example.com"
 */
export function extractDomainFromWebsite(
  websiteUrl: string | null | undefined,
): string | null {
  if (!websiteUrl || typeof websiteUrl !== 'string') return null;

  try {
    // Handle URLs without protocol
    let urlStr = websiteUrl.trim();
    if (!urlStr.includes('://')) {
      urlStr = `https://${urlStr}`;
    }

    const url = new URL(urlStr);
    let domain = url.hostname.toLowerCase();

    // Remove www. prefix if present
    if (domain.startsWith('www.')) {
      domain = domain.substring(4);
    }

    return domain || null;
  } catch {
    // If URL parsing fails, try simple extraction
    const match = websiteUrl.match(
      /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/i,
    );
    return match ? match[1].toLowerCase() : null;
  }
}

/**
 * Builds a LinkedIn company URN from company ID.
 *
 * @param companyId - LinkedIn company numeric ID
 * @returns URN string or null
 */
export function buildLinkedinCompanyUrn(
  companyId: string | null | undefined,
): string | null {
  if (!companyId) return null;

  // If already a URN, return as-is
  if (companyId.includes('urn:li:')) {
    return companyId;
  }

  // Build URN from numeric ID
  return `urn:li:fsd_company:${companyId}`;
}

/**
 * Maps a prospect SearchItem to company/organization data.
 * Pulls data from job_company_* fields and enriched profile data.
 *
 * @param item - SearchItem from prospect search response
 * @returns MappedCompany with all available fields populated
 *
 * @example
 * mapProspectCompany(item)
 * // => { name: "Acme Corp", domain: "acme.com", ... }
 */
export function mapProspectCompany(item: SearchItem): MappedCompany | null {
  // Get company name from multiple sources
  const companyName =
    item.job_company_name ||
    item.enriched?.profile?.job_company_name ||
    item.enriched?.preview?.company?.name;

  // Skip if no company name
  if (!companyName || typeof companyName !== 'string') {
    return null;
  }

  // Get website and derive domain
  const website =
    item.job_company_website ||
    item.enriched?.profile?.job_company_website ||
    item.enriched?.preview?.company?.domain;

  const domain = extractDomainFromWebsite(website);

  // Get industry
  const industry =
    item.job_company_industry ||
    item.enriched?.profile?.job_company_industry ||
    item.enriched?.preview?.company?.industry ||
    null;

  // Get size range
  const sizeStr =
    item.job_company_size ||
    item.enriched?.profile?.job_company_size ||
    item.enriched?.preview?.company?.size_range;
  const sizeRange = mapCompanySizeRange(sizeStr);

  // Get founded year
  const foundedYear =
    item.job_company_founded ||
    item.enriched?.profile?.job_company_founded ||
    item.enriched?.preview?.company?.founded ||
    null;

  // Get company type
  const typeStr =
    item.job_company_type || item.enriched?.profile?.job_company_type;
  const type = mapCompanyType(typeStr);

  // Get financial data
  const inferredRevenue =
    item.job_company_inferred_revenue ||
    item.enriched?.profile?.job_company_inferred_revenue ||
    null;

  const totalFundingRaised =
    item.job_company_total_funding_raised ||
    item.enriched?.profile?.job_company_total_funding_raised ||
    null;

  // Get LinkedIn data
  const linkedinUrl = item.job_company_linkedin_url || null;
  const linkedinCompanyId =
    item.job_company_linkedin_id ||
    item.enriched?.profile?.job_company_linkedin_id ||
    item.enriched?.profile?.job_company_id ||
    null;
  const linkedinCompanyUrn = buildLinkedinCompanyUrn(linkedinCompanyId);

  // Get location display name
  const locationDisplayName =
    item.job_company_location_name ||
    item.enriched?.profile?.job_company_location_name ||
    item.enriched?.preview?.company?.location ||
    null;

  return {
    name: companyName.trim(),
    domain,
    website: website || null,
    industry,
    sizeRange,
    foundedYear,
    type,
    inferredRevenue,
    totalFundingRaised,
    linkedinUrl,
    linkedinCompanyId,
    linkedinCompanyUrn,
    locationDisplayName,
  };
}
