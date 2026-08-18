import { isValidEmail, normalizeEmail, MAX_EMAIL_LENGTH } from './email.js';

describe('normalizeEmail', () => {
  it('trims surrounding whitespace and lowercases', () => {
    expect(normalizeEmail('  Person@Example.COM  ')).toBe('person@example.com');
  });

  it('returns an empty string for non-string input', () => {
    expect(normalizeEmail(undefined)).toBe('');
    expect(normalizeEmail(null)).toBe('');
    expect(normalizeEmail(42)).toBe('');
  });
});

describe('isValidEmail', () => {
  it('accepts ordinary addresses', () => {
    for (const ok of ['a@b.co', 'person@example.com', 'first.last+tag@sub.domain.io']) {
      expect(isValidEmail(ok)).toBe(true);
    }
  });

  it('rejects addresses missing an @, a dotted domain, or the local part', () => {
    for (const bad of ['plainaddress', 'no@dot', '@example.com', 'person@', 'a@b.']) {
      expect(isValidEmail(bad)).toBe(false);
    }
  });

  it('rejects whitespace, empty, and non-string values', () => {
    for (const bad of ['', ' ', 'has space@example.com', 'a@ b.com', undefined, null, 123]) {
      expect(isValidEmail(bad)).toBe(false);
    }
  });

  it('rejects addresses longer than the RFC practical maximum', () => {
    const tooLong = 'a'.repeat(MAX_EMAIL_LENGTH) + '@example.com';
    expect(tooLong.length).toBeGreaterThan(MAX_EMAIL_LENGTH);
    expect(isValidEmail(tooLong)).toBe(false);
  });

  it('pairs with normalizeEmail: a padded mixed-case address validates once normalized', () => {
    expect(isValidEmail(normalizeEmail('  You@Example.COM '))).toBe(true);
  });
});
