/**
 * LinkedIn URL Normalization Helper
 *
 * Normalizes LinkedIn profile URLs to a consistent format for uniqueness checks.
 * Rules:
 * - Lowercase
 * - Trim whitespace
 * - Remove trailing slash
 * - Remove query parameters and fragments
 * - Ensure https:// prefix
 * - Normalize to linkedin.com/in/<slug> format
 */

/**
 * Normalizes a LinkedIn URL to a consistent format.
 *
 * @param input - The LinkedIn URL to normalize
 * @returns Normalized LinkedIn URL in lowercase without trailing slash
 * @throws Error if the URL doesn't appear to be a LinkedIn profile URL
 *
 * @example
 * normalizeLinkedinUrl("https://www.linkedin.com/in/shahjaydeep/")
 * // => "https://linkedin.com/in/shahjaydeep"
 *
 * normalizeLinkedinUrl("linkedin.com/in/shahjaydeep?utm_source=google")
 * // => "https://linkedin.com/in/shahjaydeep"
 *
 * normalizeLinkedinUrl("  HTTPS://LinkedIn.com/in/JohnDoe  ")
 * // => "https://linkedin.com/in/johndoe"
 */
export function normalizeLinkedinUrl(input: string): string {
  if (!input || typeof input !== 'string') {
    throw new Error('LinkedIn URL is required');
  }

  // Trim whitespace
  let url = input.trim();

  // Convert to lowercase
  url = url.toLowerCase();

  // Add https:// prefix if missing
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  // Convert http:// to https://
  if (url.startsWith('http://')) {
    url = url.replace('http://', 'https://');
  }

  // Remove query parameters and fragments
  const queryIndex = url.indexOf('?');
  if (queryIndex !== -1) {
    url = url.substring(0, queryIndex);
  }
  const hashIndex = url.indexOf('#');
  if (hashIndex !== -1) {
    url = url.substring(0, hashIndex);
  }

  // Remove any trailing slashes
  while (url.endsWith('/')) {
    url = url.slice(0, -1);
  }

  // Normalize www.linkedin.com to linkedin.com
  url = url.replace('https://www.linkedin.com', 'https://linkedin.com');

  // Validate it looks like a LinkedIn profile URL
  const linkedinProfileRegex = /^https:\/\/linkedin\.com\/in\/[a-z0-9_-]+$/i;
  if (!linkedinProfileRegex.test(url)) {
    throw new Error(
      `Invalid LinkedIn profile URL format: ${input}. Expected format: https://linkedin.com/in/username`,
    );
  }

  return url;
}

/**
 * Extracts the LinkedIn username/slug from a normalized or raw LinkedIn URL.
 *
 * @param input - The LinkedIn URL
 * @returns The username portion of the URL
 *
 * @example
 * extractLinkedinUsername("https://www.linkedin.com/in/shahjaydeep")
 * // => "shahjaydeep"
 */
export function extractLinkedinUsername(input: string): string {
  const normalized = normalizeLinkedinUrl(input);
  const match = normalized.match(/\/in\/([a-z0-9_-]+)$/i);
  if (!match) {
    throw new Error(`Could not extract username from LinkedIn URL: ${input}`);
  }
  return match[1];
}

/**
 * Safely normalizes a LinkedIn URL, returning null instead of throwing on invalid input.
 *
 * @param input - The LinkedIn URL to normalize
 * @returns Normalized URL or null if invalid/missing
 */
export function safeNormalizeLinkedinUrl(
  input: string | null | undefined,
): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  try {
    return normalizeLinkedinUrl(input);
  } catch {
    return null;
  }
}

/**
 * Checks if a string looks like a LinkedIn profile URL (loose check).
 *
 * @param input - The string to check
 * @returns True if it appears to be a LinkedIn profile URL
 */
export function isLinkedinProfileUrl(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }

  const trimmed = input.trim().toLowerCase();
  return (
    trimmed.includes('linkedin.com/in/') || trimmed.includes('linkedin.com/in/')
  );
}
