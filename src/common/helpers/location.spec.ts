import {
  buildLocationNormalizedKey,
  buildLocationDisplayName,
  parseLocationFromProspect,
  parseCompanyLocationFromProspect,
  LocationKeyInput,
  ParsedLocation,
} from './location';
import { SearchItem } from '../interfaces/scraper.interfaces';

describe('buildLocationNormalizedKey', () => {
  describe('with LocationKeyInput object', () => {
    it('should build key from city, region, country', () => {
      const input: LocationKeyInput = {
        city: 'San Francisco',
        region: 'California',
        country: 'United States',
      };
      expect(buildLocationNormalizedKey(input)).toBe(
        'united states|california|san francisco',
      );
    });

    it('should handle missing city', () => {
      const input: LocationKeyInput = {
        region: 'California',
        country: 'United States',
      };
      expect(buildLocationNormalizedKey(input)).toBe(
        'united states|california',
      );
    });

    it('should handle missing region', () => {
      const input: LocationKeyInput = {
        city: 'San Francisco',
        country: 'United States',
      };
      expect(buildLocationNormalizedKey(input)).toBe(
        'united states|san francisco',
      );
    });

    it('should handle only country', () => {
      const input: LocationKeyInput = {
        country: 'United States',
      };
      expect(buildLocationNormalizedKey(input)).toBe('united states');
    });

    it('should return "unknown" for empty input', () => {
      const input: LocationKeyInput = {};
      expect(buildLocationNormalizedKey(input)).toBe('unknown');
    });

    it('should handle null values', () => {
      const input: LocationKeyInput = {
        city: null,
        region: null,
        country: 'Germany',
      };
      expect(buildLocationNormalizedKey(input)).toBe('germany');
    });

    it('should trim and lowercase values', () => {
      const input: LocationKeyInput = {
        city: '  NEW YORK  ',
        region: '  New York  ',
        country: '  USA  ',
      };
      expect(buildLocationNormalizedKey(input)).toBe('usa|new york|new york');
    });
  });

  describe('with string input', () => {
    it('should normalize raw location string', () => {
      expect(
        buildLocationNormalizedKey('San Francisco, California, United States'),
      ).toBe('san francisco, california, united states');
    });

    it('should handle uppercase string', () => {
      expect(buildLocationNormalizedKey('NEW YORK')).toBe('new york');
    });

    it('should return "unknown" for empty string', () => {
      expect(buildLocationNormalizedKey('')).toBe('unknown');
    });

    it('should trim whitespace', () => {
      expect(buildLocationNormalizedKey('  London, UK  ')).toBe('london, uk');
    });
  });
});

describe('buildLocationDisplayName', () => {
  it('should build display name from all parts', () => {
    const input: LocationKeyInput = {
      city: 'San Francisco',
      region: 'California',
      country: 'United States',
    };
    expect(buildLocationDisplayName(input)).toBe(
      'San Francisco, California, United States',
    );
  });

  it('should handle missing parts', () => {
    expect(buildLocationDisplayName({ city: 'London', country: 'UK' })).toBe(
      'London, UK',
    );
  });

  it('should handle only city', () => {
    expect(buildLocationDisplayName({ city: 'Berlin' })).toBe('Berlin');
  });

  it('should return "Unknown" for empty input', () => {
    expect(buildLocationDisplayName({})).toBe('Unknown');
  });
});

describe('parseLocationFromProspect', () => {
  it('should parse from enriched.profile.location', () => {
    const item = {
      enriched: {
        profile: {
          location: {
            short: 'SF',
            country: 'United States',
            default: 'San Francisco, California, United States',
          },
        },
      },
      location_name: 'Fallback Location',
    } as unknown as SearchItem;

    const result = parseLocationFromProspect(item);
    expect(result.city).toBe('San Francisco');
    expect(result.region).toBe('California');
    expect(result.country).toBe('United States');
    expect(result.normalizedKey).toBe('united states|california|san francisco');
    expect(result.displayName).toBe('San Francisco, California, United States');
  });

  it('should fallback to location_name when enriched not available', () => {
    const item = {
      location_name: 'Berlin, Germany',
      enriched: {},
    } as unknown as SearchItem;

    const result = parseLocationFromProspect(item);
    expect(result.city).toBe('Berlin');
    expect(result.country).toBe('Germany');
    expect(result.normalizedKey).toBe('germany|berlin');
  });

  it('should handle single location component', () => {
    const item = {
      location_name: 'United Kingdom',
      enriched: {},
    } as unknown as SearchItem;

    const result = parseLocationFromProspect(item);
    expect(result.country).toBe('United Kingdom');
    expect(result.city).toBeNull();
    expect(result.normalizedKey).toBe('united kingdom');
  });

  it('should handle empty location', () => {
    const item = {
      location_name: '',
      enriched: {},
    } as unknown as SearchItem;

    const result = parseLocationFromProspect(item);
    expect(result.normalizedKey).toBe('unknown');
    expect(result.displayName).toBe('Unknown');
  });
});

describe('parseCompanyLocationFromProspect', () => {
  it('should parse from job_company_location_name', () => {
    const item = {
      job_company_location_name: 'New York, NY, USA',
    } as unknown as SearchItem;

    const result = parseCompanyLocationFromProspect(item);
    expect(result.city).toBe('New York');
    expect(result.region).toBe('NY');
    expect(result.country).toBe('USA');
  });

  it('should fallback to enriched.profile.job_company_location_name', () => {
    const item = {
      job_company_location_name: null,
      enriched: {
        profile: {
          job_company_location_name: 'London, UK',
        },
      },
    } as unknown as SearchItem;

    const result = parseCompanyLocationFromProspect(item);
    expect(result.city).toBe('London');
    expect(result.country).toBe('UK');
  });
});

describe('person deduplication scenario', () => {
  it('should generate same normalizedKey for equivalent locations', () => {
    const location1: LocationKeyInput = {
      city: 'San Francisco',
      region: 'California',
      country: 'United States',
    };

    const location2: LocationKeyInput = {
      city: '  SAN FRANCISCO  ',
      region: '  CALIFORNIA  ',
      country: '  UNITED STATES  ',
    };

    expect(buildLocationNormalizedKey(location1)).toBe(
      buildLocationNormalizedKey(location2),
    );
  });
});
