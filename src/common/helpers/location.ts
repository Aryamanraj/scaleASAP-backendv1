/**
 * Location Helper Functions
 *
 * Utilities for parsing and normalizing location data from prospect sources.
 */

import { SearchItem, LocationInfo } from '../interfaces/scraper.interfaces';

/**
 * Parsed location data structure for upsert operations.
 */
export interface ParsedLocation {
  city: string | null;
  region: string | null;
  country: string | null;
  countryCode: string | null;
  displayName: string;
  normalizedKey: string;
}

/**
 * Input structure for buildLocationNormalizedKey.
 */
export interface LocationKeyInput {
  city?: string | null;
  region?: string | null;
  country?: string | null;
  countryCode?: string | null;
}

/**
 * Builds a normalized key for location deduplication.
 * The key is a lowercase, trimmed, pipe-separated concatenation of country|region|city.
 *
 * @param input - LocationKeyInput object or raw location string
 * @returns Normalized location key (never empty)
 *
 * @example
 * buildLocationNormalizedKey({ city: 'San Francisco', region: 'California', country: 'United States' })
 * // => "united states|california|san francisco"
 *
 * buildLocationNormalizedKey("San Francisco, California, United States")
 * // => "san francisco, california, united states"
 */
export function buildLocationNormalizedKey(
  input: LocationKeyInput | string,
): string {
  if (typeof input === 'string') {
    // If given a raw string, normalize it directly
    const normalized = input.toLowerCase().trim();
    return normalized || 'unknown';
  }

  const parts: string[] = [];

  // Order: country | region | city (for consistent hierarchical sorting)
  if (input.country) {
    parts.push(input.country.toLowerCase().trim());
  }
  if (input.region) {
    parts.push(input.region.toLowerCase().trim());
  }
  if (input.city) {
    parts.push(input.city.toLowerCase().trim());
  }

  const key = parts.join('|');
  return key || 'unknown';
}

/**
 * Builds a human-readable display name from location components.
 *
 * @param input - Location components
 * @returns Display string like "San Francisco, California, United States"
 */
export function buildLocationDisplayName(input: LocationKeyInput): string {
  const parts: string[] = [];

  if (input.city) {
    parts.push(input.city.trim());
  }
  if (input.region) {
    parts.push(input.region.trim());
  }
  if (input.country) {
    parts.push(input.country.trim());
  }

  return parts.join(', ') || 'Unknown';
}

/**
 * Parses a location string like "San Francisco, California, United States"
 * into components. This is a best-effort heuristic.
 *
 * @param locationStr - Raw location string
 * @returns Parsed components
 */
function parseLocationString(locationStr: string): {
  city: string | null;
  region: string | null;
  country: string | null;
} {
  if (!locationStr || typeof locationStr !== 'string') {
    return { city: null, region: null, country: null };
  }

  const parts = locationStr
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (parts.length === 0) {
    return { city: null, region: null, country: null };
  }

  if (parts.length === 1) {
    // Single part - assume it's country or could be city
    return { city: null, region: null, country: parts[0] };
  }

  if (parts.length === 2) {
    // Two parts - assume city, country (or region, country)
    return { city: parts[0], region: null, country: parts[1] };
  }

  // Three or more parts - assume city, region, country
  return {
    city: parts[0],
    region: parts[1],
    country: parts.slice(2).join(', '),
  };
}

/**
 * Parses location data from a prospect SearchItem.
 * Prioritizes enriched.profile.location over top-level location_name.
 *
 * @param item - SearchItem from prospect search response
 * @returns ParsedLocation with all fields populated
 *
 * @example
 * parseLocationFromProspect(item)
 * // => { city: "San Francisco", region: "California", country: "United States", countryCode: null, displayName: "San Francisco, California, United States", normalizedKey: "united states|california|san francisco" }
 */
export function parseLocationFromProspect(item: SearchItem): ParsedLocation {
  // Try enriched profile location first
  const enrichedLocation: LocationInfo | undefined =
    item.enriched?.profile?.location;

  if (enrichedLocation && typeof enrichedLocation === 'object') {
    // enriched.profile.location has { short, country, default }
    // "default" is typically the full display string like "San Francisco, California, United States"
    const defaultStr = enrichedLocation.default || '';
    const countryStr = enrichedLocation.country || '';

    const parsed = parseLocationString(defaultStr);

    // Override country from enriched if available
    const country = countryStr || parsed.country;

    const locationInput: LocationKeyInput = {
      city: parsed.city,
      region: parsed.region,
      country: country,
      countryCode: null,
    };

    return {
      city: parsed.city,
      region: parsed.region,
      country: country,
      countryCode: null,
      displayName: buildLocationDisplayName(locationInput),
      normalizedKey: buildLocationNormalizedKey(locationInput),
    };
  }

  // Fallback to top-level location_name
  const locationName = item.location_name || '';
  const parsed = parseLocationString(locationName);

  const locationInput: LocationKeyInput = {
    city: parsed.city,
    region: parsed.region,
    country: parsed.country,
    countryCode: null,
  };

  return {
    city: parsed.city,
    region: parsed.region,
    country: parsed.country,
    countryCode: null,
    displayName: buildLocationDisplayName(locationInput),
    normalizedKey: buildLocationNormalizedKey(locationInput),
  };
}

/**
 * Parses company location from a prospect SearchItem.
 * Uses job_company_location_name field.
 *
 * @param item - SearchItem from prospect search response
 * @returns ParsedLocation for the company
 */
export function parseCompanyLocationFromProspect(
  item: SearchItem,
): ParsedLocation {
  const locationName =
    item.job_company_location_name ||
    item.enriched?.profile?.job_company_location_name ||
    '';

  const parsed = parseLocationString(locationName);

  const locationInput: LocationKeyInput = {
    city: parsed.city,
    region: parsed.region,
    country: parsed.country,
    countryCode: null,
  };

  return {
    city: parsed.city,
    region: parsed.region,
    country: parsed.country,
    countryCode: null,
    displayName: buildLocationDisplayName(locationInput),
    normalizedKey: buildLocationNormalizedKey(locationInput),
  };
}
