import {
  BAGS_MAX,
  BAGS_MIN,
  clampBags,
  formatBags,
  mostRecentBags,
  stepBags,
} from './bags';

describe('clampBags', () => {
  it('clamps below the minimum up to BAGS_MIN (0)', () => {
    expect(clampBags(-2)).toBe(BAGS_MIN);
    expect(BAGS_MIN).toBe(0);
  });

  it('clamps above the maximum down to BAGS_MAX', () => {
    expect(clampBags(99)).toBe(BAGS_MAX);
  });

  it('rounds fractional values to a whole bag count', () => {
    expect(clampBags(2.6)).toBe(3);
    expect(clampBags(2.4)).toBe(2);
  });

  it('leaves an in-range whole value unchanged', () => {
    expect(clampBags(3)).toBe(3);
    expect(clampBags(0)).toBe(0);
  });
});

describe('stepBags', () => {
  it('steps up and down by one bag', () => {
    expect(stepBags(3, 1)).toBe(4);
    expect(stepBags(3, -1)).toBe(2);
  });

  it('does not step below the minimum (0)', () => {
    expect(stepBags(BAGS_MIN, -1)).toBe(BAGS_MIN);
  });

  it('does not step above the maximum', () => {
    expect(stepBags(BAGS_MAX, 1)).toBe(BAGS_MAX);
  });
});

describe('formatBags', () => {
  it('uses the singular for exactly one bag', () => {
    expect(formatBags(1)).toBe('1 bag');
  });

  it('uses the plural for zero and many', () => {
    expect(formatBags(0)).toBe('0 bags');
    expect(formatBags(3)).toBe('3 bags');
  });
});

describe('mostRecentBags (seed-on-tap source)', () => {
  it('returns undefined for an empty list', () => {
    expect(mostRecentBags([])).toBeUndefined();
  });

  it('returns undefined when no mow recorded bags', () => {
    expect(mostRecentBags([{}, {}, {}])).toBeUndefined();
  });

  it('returns the first recorded count in a newest-first list', () => {
    expect(mostRecentBags([{ clippingBags: 2 }, { clippingBags: 5 }])).toBe(2);
  });

  it('skips recent mows without bags to find the last one that had them', () => {
    expect(mostRecentBags([{}, { clippingBags: 4 }, { clippingBags: 1 }])).toBe(4);
  });

  it('treats a recorded 0 as a real value, not "unset"', () => {
    // The truthiness trap: 0 is a legitimate recorded count.
    expect(mostRecentBags([{ clippingBags: 0 }])).toBe(0);
  });
});
