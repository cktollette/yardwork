import {
  MIN_MOW_DURATION_SECONDS,
  formatShortDuration,
  needsShortMowConfirmation,
} from './mowValidation';

describe('needsShortMowConfirmation', () => {
  it('flags durations strictly under the floor', () => {
    expect(needsShortMowConfirmation(179)).toBe(true);
    expect(needsShortMowConfirmation(0)).toBe(true);
    expect(needsShortMowConfirmation(4)).toBe(true);
  });

  it('does not flag the floor or above', () => {
    expect(needsShortMowConfirmation(MIN_MOW_DURATION_SECONDS)).toBe(false); // exactly 180 saves clean
    expect(needsShortMowConfirmation(180)).toBe(false);
    expect(needsShortMowConfirmation(181)).toBe(false);
  });
});

describe('formatShortDuration', () => {
  it('renders minutes and seconds', () => {
    expect(formatShortDuration(100)).toBe('1m 40s');
  });

  it('omits minutes under a minute', () => {
    expect(formatShortDuration(45)).toBe('45s');
    expect(formatShortDuration(0)).toBe('0s');
  });
});
