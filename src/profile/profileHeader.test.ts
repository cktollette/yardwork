import { formatProfileLocationLine, grassSegment, profileDisplayName } from './profileHeader';

const ASCII = /^[\x00-\x7F]*$/;

describe('profileDisplayName', () => {
  it('uses the property nickname, else falls back to "My Lawn"', () => {
    expect(profileDisplayName({ name: 'Back 40' })).toBe('Back 40');
    expect(profileDisplayName({ name: 'My Lawn' })).toBe('My Lawn');
    expect(profileDisplayName({ name: '   ' })).toBe('My Lawn');
    expect(profileDisplayName(null)).toBe('My Lawn');
  });
});

describe('formatProfileLocationLine — all presence combinations', () => {
  it('omits everything cleanly when all fields are absent', () => {
    expect(formatProfileLocationLine({})).toBe('');
  });

  it('city + region when region is present', () => {
    expect(formatProfileLocationLine({ city: 'Dallas', region: 'Texas' })).toBe('Dallas, Texas');
  });

  it('city + country name when region is absent (Utrecht, Netherlands)', () => {
    expect(
      formatProfileLocationLine({ city: 'Utrecht', countryName: 'Netherlands' }),
    ).toBe('Utrecht, Netherlands');
  });

  it('region-only and country-only degrade to that single part', () => {
    expect(formatProfileLocationLine({ region: 'Texas' })).toBe('Texas');
    expect(formatProfileLocationLine({ countryName: 'Netherlands' })).toBe('Netherlands');
    expect(formatProfileLocationLine({ city: 'Dallas' })).toBe('Dallas');
  });

  it('appends Zone and grass with " - ", each omitting cleanly', () => {
    expect(
      formatProfileLocationLine({ city: 'Dallas', region: 'Texas', zone: '8a', grassTypes: ['Fescue'] }),
    ).toBe('Dallas, Texas - Zone 8a - Fescue');
    expect(formatProfileLocationLine({ zone: '8a' })).toBe('Zone 8a');
    expect(formatProfileLocationLine({ grassTypes: ['Bermuda'] })).toBe('Bermuda');
    expect(
      formatProfileLocationLine({ city: 'Utrecht', countryName: 'Netherlands', zone: '8a' }),
    ).toBe('Utrecht, Netherlands - Zone 8a');
    // Zone present but place absent: no dangling leading separator.
    expect(formatProfileLocationLine({ zone: '8a', grassTypes: ['Fescue'] })).toBe('Zone 8a - Fescue');
  });

  it('derives the grass segment from all zones (dedupe, order, "Mixed")', () => {
    expect(grassSegment([])).toBeUndefined();
    expect(grassSegment([undefined, undefined])).toBeUndefined();
    expect(grassSegment(['Fescue'])).toBe('Fescue');
    expect(grassSegment(['Fescue', 'Fescue'])).toBe('Fescue'); // duplicate dedupes to one
    expect(grassSegment(['Bermuda', 'Fescue'])).toBe('Bermuda + Fescue'); // two distinct, zone order
    expect(grassSegment(['Fescue', 'Bermuda'])).toBe('Fescue + Bermuda');
    expect(grassSegment(['Fescue', 'Bermuda', 'Zoysia'])).toBe('Mixed'); // three or more
    // In the line: multiple zones collapse to one grass segment.
    expect(
      formatProfileLocationLine({ city: 'Dallas', region: 'TX', grassTypes: ['Bermuda', 'Fescue'] }),
    ).toBe('Dallas, TX - Bermuda + Fescue');
  });

  it('produces ASCII-only output across every combination (no interpunct)', () => {
    const inputs = [
      {},
      { city: 'Dallas' },
      { city: 'Dallas', region: 'Texas' },
      { city: 'Utrecht', countryName: 'Netherlands' },
      { region: 'Texas' },
      { countryName: 'Netherlands' },
      { city: 'Dallas', region: 'Texas', zone: '8a', grassType: 'Fescue' },
      { city: 'Utrecht', countryName: 'Netherlands', zone: '8a' },
      { zone: '8a', grassTypes: ['Fescue'] },
      { city: 'Dallas', region: 'TX', grassTypes: ['Bermuda', 'Fescue'] }, // "A + B" is ASCII
    ];
    for (const input of inputs) {
      expect(ASCII.test(formatProfileLocationLine(input))).toBe(true);
    }
  });
});
