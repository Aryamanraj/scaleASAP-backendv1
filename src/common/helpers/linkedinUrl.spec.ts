import {
  normalizeLinkedinUrl,
  extractLinkedinUsername,
  safeNormalizeLinkedinUrl,
  isLinkedinProfileUrl,
} from './linkedinUrl';

describe('normalizeLinkedinUrl', () => {
  describe('valid URLs', () => {
    it('should normalize URL with trailing slash', () => {
      expect(normalizeLinkedinUrl('https://www.linkedin.com/in/johndoe/')).toBe(
        'https://linkedin.com/in/johndoe',
      );
    });

    it('should normalize URL without protocol', () => {
      expect(normalizeLinkedinUrl('linkedin.com/in/johndoe')).toBe(
        'https://linkedin.com/in/johndoe',
      );
    });

    it('should convert to lowercase', () => {
      expect(normalizeLinkedinUrl('HTTPS://LinkedIn.com/in/JohnDoe')).toBe(
        'https://linkedin.com/in/johndoe',
      );
    });

    it('should trim whitespace', () => {
      expect(normalizeLinkedinUrl('  https://linkedin.com/in/johndoe  ')).toBe(
        'https://linkedin.com/in/johndoe',
      );
    });

    it('should remove query parameters', () => {
      expect(
        normalizeLinkedinUrl(
          'https://linkedin.com/in/johndoe?utm_source=google&ref=abc',
        ),
      ).toBe('https://linkedin.com/in/johndoe');
    });

    it('should remove fragment/hash', () => {
      expect(
        normalizeLinkedinUrl('https://linkedin.com/in/johndoe#section'),
      ).toBe('https://linkedin.com/in/johndoe');
    });

    it('should convert http to https', () => {
      expect(normalizeLinkedinUrl('http://linkedin.com/in/johndoe')).toBe(
        'https://linkedin.com/in/johndoe',
      );
    });

    it('should normalize www.linkedin.com to linkedin.com', () => {
      expect(normalizeLinkedinUrl('https://www.linkedin.com/in/johndoe')).toBe(
        'https://linkedin.com/in/johndoe',
      );
    });

    it('should handle usernames with hyphens and underscores', () => {
      expect(normalizeLinkedinUrl('https://linkedin.com/in/john-doe_123')).toBe(
        'https://linkedin.com/in/john-doe_123',
      );
    });

    it('should handle complex real-world URL', () => {
      expect(
        normalizeLinkedinUrl(
          'https://www.LinkedIn.com/in/JohnDoe-123/?utm_source=email&utm_medium=member_search',
        ),
      ).toBe('https://linkedin.com/in/johndoe-123');
    });
  });

  describe('invalid URLs', () => {
    it('should throw for empty string', () => {
      expect(() => normalizeLinkedinUrl('')).toThrow(
        'LinkedIn URL is required',
      );
    });

    it('should throw for null/undefined', () => {
      expect(() => normalizeLinkedinUrl(null as any)).toThrow(
        'LinkedIn URL is required',
      );
      expect(() => normalizeLinkedinUrl(undefined as any)).toThrow(
        'LinkedIn URL is required',
      );
    });

    it('should throw for non-LinkedIn URL', () => {
      expect(() => normalizeLinkedinUrl('https://twitter.com/johndoe')).toThrow(
        'Invalid LinkedIn profile URL format',
      );
    });

    it('should throw for LinkedIn company URL', () => {
      expect(() =>
        normalizeLinkedinUrl('https://linkedin.com/company/acme'),
      ).toThrow('Invalid LinkedIn profile URL format');
    });

    it('should throw for LinkedIn URL without username', () => {
      expect(() => normalizeLinkedinUrl('https://linkedin.com/in/')).toThrow(
        'Invalid LinkedIn profile URL format',
      );
    });
  });
});

describe('extractLinkedinUsername', () => {
  it('should extract username from normalized URL', () => {
    expect(extractLinkedinUsername('https://linkedin.com/in/johndoe')).toBe(
      'johndoe',
    );
  });

  it('should extract username from URL with www', () => {
    expect(extractLinkedinUsername('https://www.linkedin.com/in/johndoe')).toBe(
      'johndoe',
    );
  });

  it('should extract username with special characters', () => {
    expect(
      extractLinkedinUsername('https://linkedin.com/in/john-doe_123'),
    ).toBe('john-doe_123');
  });

  it('should handle URL with trailing slash and params', () => {
    expect(
      extractLinkedinUsername('https://linkedin.com/in/johndoe/?ref=abc'),
    ).toBe('johndoe');
  });
});

describe('safeNormalizeLinkedinUrl', () => {
  it('should return normalized URL for valid input', () => {
    expect(
      safeNormalizeLinkedinUrl('https://www.linkedin.com/in/johndoe'),
    ).toBe('https://linkedin.com/in/johndoe');
  });

  it('should return null for invalid URL', () => {
    expect(safeNormalizeLinkedinUrl('not-a-url')).toBeNull();
  });

  it('should return null for null input', () => {
    expect(safeNormalizeLinkedinUrl(null)).toBeNull();
  });

  it('should return null for undefined input', () => {
    expect(safeNormalizeLinkedinUrl(undefined)).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(safeNormalizeLinkedinUrl('')).toBeNull();
  });
});

describe('isLinkedinProfileUrl', () => {
  it('should return true for valid LinkedIn profile URL', () => {
    expect(isLinkedinProfileUrl('https://linkedin.com/in/johndoe')).toBe(true);
  });

  it('should return true for URL with www', () => {
    expect(isLinkedinProfileUrl('https://www.linkedin.com/in/johndoe')).toBe(
      true,
    );
  });

  it('should return false for LinkedIn company URL', () => {
    expect(isLinkedinProfileUrl('https://linkedin.com/company/acme')).toBe(
      false,
    );
  });

  it('should return false for non-LinkedIn URL', () => {
    expect(isLinkedinProfileUrl('https://twitter.com/johndoe')).toBe(false);
  });

  it('should return false for null/undefined', () => {
    expect(isLinkedinProfileUrl(null as any)).toBe(false);
    expect(isLinkedinProfileUrl(undefined as any)).toBe(false);
  });
});
