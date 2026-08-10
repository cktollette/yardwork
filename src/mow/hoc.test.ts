import {
  clampHoc,
  formatHoc,
  HOC_MAX,
  HOC_MIN,
  mostRecentHoc,
  stepHoc,
} from './hoc';

describe('clampHoc', () => {
  it('clamps below the minimum up to HOC_MIN', () => {
    expect(clampHoc(0)).toBe(HOC_MIN);
    expect(clampHoc(-3)).toBe(HOC_MIN);
  });

  it('clamps above the maximum down to HOC_MAX', () => {
    expect(clampHoc(10)).toBe(HOC_MAX);
  });

  it('snaps off-step values to the nearest 0.25" step', () => {
    expect(clampHoc(2.6)).toBe(2.5);
    expect(clampHoc(2.7)).toBe(2.75);
    expect(clampHoc(1.13)).toBe(1.25);
  });

  it('leaves an in-range, on-step value unchanged', () => {
    expect(clampHoc(2.75)).toBe(2.75);
  });
});

describe('stepHoc', () => {
  it('steps up and down by one 0.25" increment', () => {
    expect(stepHoc(2.5, 1)).toBe(2.75);
    expect(stepHoc(2.5, -1)).toBe(2.25);
  });

  it('does not step above the maximum', () => {
    expect(stepHoc(HOC_MAX, 1)).toBe(HOC_MAX);
  });

  it('does not step below the minimum', () => {
    expect(stepHoc(HOC_MIN, -1)).toBe(HOC_MIN);
  });
});

describe('formatHoc', () => {
  it('renders a whole number without a decimal', () => {
    expect(formatHoc(3)).toBe('3"');
  });

  it('renders a half-inch value', () => {
    expect(formatHoc(2.5)).toBe('2.5"');
  });

  it('renders a quarter-inch value', () => {
    expect(formatHoc(2.75)).toBe('2.75"');
  });

  it('trims trailing zeros', () => {
    expect(formatHoc(2.5)).toBe('2.5"');
    expect(formatHoc(4.0)).toBe('4"');
  });
});

describe('mostRecentHoc (default-to-last-mow)', () => {
  it('returns undefined for an empty list', () => {
    expect(mostRecentHoc([])).toBeUndefined();
  });

  it('returns undefined when no mow has a height of cut', () => {
    expect(mostRecentHoc([{}, {}, {}])).toBeUndefined();
  });

  it('returns the first defined hocInches in a newest-first list', () => {
    // Newest first: the most recent mow that HAS a HOC wins.
    expect(
      mostRecentHoc([{ hocInches: 2.5 }, { hocInches: 3 }]),
    ).toBe(2.5);
  });

  it('skips recent mows without a HOC to find the last one that had one', () => {
    expect(
      mostRecentHoc([{}, { hocInches: 3.25 }, { hocInches: 2 }]),
    ).toBe(3.25);
  });
});
