import {
  COUNTRIES,
  LOCATION_FIELD_MAX,
  USDA_ZONES,
  isCountryCode,
  isHardinessZone,
  normalizeLocationField,
  normalizeLocationPatch,
  resolveCountryName,
} from './location';

describe('country data', () => {
  it('resolves alpha-2 codes to display names', () => {
    expect(resolveCountryName('US')).toBe('United States');
    expect(resolveCountryName('NL')).toBe('Netherlands');
    expect(resolveCountryName('ZZ')).toBeUndefined();
    expect(resolveCountryName(undefined)).toBeUndefined();
  });

  it('exposes a sorted-by-name option list of {code,name}', () => {
    expect(COUNTRIES.find((c) => c.code === 'US')?.name).toBe('United States');
    const names = COUNTRIES.map((c) => c.name);
    expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(names);
  });

  it('isCountryCode matches only bundled codes', () => {
    expect(isCountryCode('NL')).toBe(true);
    expect(isCountryCode('nl')).toBe(false); // codes are stored uppercase
    expect(isCountryCode('ZZ')).toBe(false);
    expect(isCountryCode(undefined)).toBe(false);
  });
});

describe('USDA zones', () => {
  it('spans 1a..13b with no free text', () => {
    expect(USDA_ZONES).toHaveLength(26);
    expect(USDA_ZONES[0]).toBe('1a');
    expect(USDA_ZONES[USDA_ZONES.length - 1]).toBe('13b');
    expect(USDA_ZONES).toContain('8a');
    expect(isHardinessZone('8a')).toBe(true);
    expect(isHardinessZone('14a')).toBe(false);
    expect(isHardinessZone('tropical')).toBe(false);
  });
});

describe('normalizeLocationField', () => {
  it('trims and caps to the field max', () => {
    expect(normalizeLocationField('  Dallas  ')).toBe('Dallas');
    expect(normalizeLocationField('x'.repeat(60))).toHaveLength(LOCATION_FIELD_MAX);
  });

  it('collapses empty / whitespace-only to undefined (never "")', () => {
    expect(normalizeLocationField('')).toBeUndefined();
    expect(normalizeLocationField('   ')).toBeUndefined();
    expect(normalizeLocationField(undefined)).toBeUndefined();
  });
});

describe('normalizeLocationPatch', () => {
  it('normalizes text and validates code fields, always returning all four keys', () => {
    expect(
      normalizeLocationPatch({
        locationCity: '  Dallas ',
        locationRegion: ' Texas ',
        locationCountry: 'US',
        hardinessZone: '8a',
      }),
    ).toEqual({
      locationCity: 'Dallas',
      locationRegion: 'Texas',
      locationCountry: 'US',
      hardinessZone: '8a',
    });
  });

  it('drops invalid country/zone and blank text to undefined (clears on save)', () => {
    expect(
      normalizeLocationPatch({
        locationCity: '   ',
        locationRegion: '',
        locationCountry: 'ZZ',
        hardinessZone: 'nope',
      }),
    ).toEqual({
      locationCity: undefined,
      locationRegion: undefined,
      locationCountry: undefined,
      hardinessZone: undefined,
    });
  });
});
