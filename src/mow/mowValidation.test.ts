import {
  MIN_MOW_DURATION_SECONDS,
  MOSTLY_PAUSED_WALLCLOCK_SECONDS,
  formatShortDuration,
  isMostlyPaused,
  needsShortMowConfirmation,
  shortMowConfirmationTitle,
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

describe('isMostlyPaused (both bounds required)', () => {
  it('is true only when active is sub-floor AND wall-clock is long', () => {
    expect(isMostlyPaused(120, MOSTLY_PAUSED_WALLCLOCK_SECONDS)).toBe(true); // 2m active, 10m elapsed
    expect(isMostlyPaused(120, MOSTLY_PAUSED_WALLCLOCK_SECONDS - 1)).toBe(false); // wall-clock too short
    expect(isMostlyPaused(MIN_MOW_DURATION_SECONDS, 3600)).toBe(false); // active not sub-floor
    expect(isMostlyPaused(120, 120)).toBe(false); // genuinely quick (no long pause)
  });
});

describe('shortMowConfirmationTitle', () => {
  it('uses the mostly-paused copy (ASCII, active minutes) when paused for most of it', () => {
    // 150s active (2m), 20m wall-clock.
    expect(shortMowConfirmationTitle(150, 1200)).toBe(
      'You were paused for most of this one. Save 2 minutes of mowing?',
    );
    // Singular minute.
    expect(shortMowConfirmationTitle(90, 1200)).toBe(
      'You were paused for most of this one. Save 1 minute of mowing?',
    );
    // No em dashes / non-ASCII.
    expect(/[^\x00-\x7F]/.test(shortMowConfirmationTitle(150, 1200))).toBe(false);
  });

  it('keeps the original "that was quick" copy for a genuinely short mow', () => {
    expect(shortMowConfirmationTitle(120, 120)).toBe(
      'That was quick — save this 2m 0s mow?',
    );
    // Sub-floor active but wall-clock just under the mostly-paused bound: still "quick".
    expect(shortMowConfirmationTitle(45, MOSTLY_PAUSED_WALLCLOCK_SECONDS - 1)).toBe(
      'That was quick — save this 45s mow?',
    );
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
