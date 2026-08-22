/**
 * Soft validation for saving a mow. A mow shorter than the floor is probably a
 * mis-tap (timer started and stopped by accident), so we ask the user to
 * confirm rather than block — real short mows still save.
 */

/**
 * Mows below this many ACTIVE seconds get a soft "that was quick" confirmation.
 *
 * NOTE (flagged, unchanged pending a decision): this 180s save-confirm floor is a
 * different guard from the 60s activity-capture window guard in
 * captureActivityForMow (MIN_WINDOW_MS). The "D-044 log says 60s" vs "code says
 * 180s" discrepancy is really two separate guards, not one mis-set value; the
 * threshold here is left at 180s.
 */
export const MIN_MOW_DURATION_SECONDS = 180;

/**
 * Wall-clock span at/above which a short (active < floor) mow is treated as
 * "mostly paused" rather than "genuinely quick" — i.e. the user was out there a
 * long time but the clock was paused for most of it.
 */
export const MOSTLY_PAUSED_WALLCLOCK_SECONDS = 600;

/**
 * Whether a mow of the given ACTIVE duration should prompt a short-mow
 * confirmation. Strictly less-than the floor: a mow of exactly the floor saves
 * clean.
 */
export function needsShortMowConfirmation(durationSeconds: number): boolean {
  return durationSeconds < MIN_MOW_DURATION_SECONDS;
}

/**
 * A sub-floor mow whose wall-clock span is long: little active time but a lot of
 * elapsed time = mostly paused. Both bounds are required.
 */
export function isMostlyPaused(activeSeconds: number, wallclockSeconds: number): boolean {
  return (
    activeSeconds < MIN_MOW_DURATION_SECONDS &&
    wallclockSeconds >= MOSTLY_PAUSED_WALLCLOCK_SECONDS
  );
}

/**
 * The confirmation title for a sub-floor mow. Distinguishes a mostly-paused mow
 * (long wall-clock, little active time) from a genuinely quick one. The
 * mostly-paused copy is ASCII-only, no em dashes; the quick copy is unchanged.
 */
export function shortMowConfirmationTitle(
  activeSeconds: number,
  wallclockSeconds: number,
): string {
  if (isMostlyPaused(activeSeconds, wallclockSeconds)) {
    const minutes = Math.max(1, Math.floor(activeSeconds / 60));
    return `You were paused for most of this one. Save ${minutes} minute${
      minutes === 1 ? '' : 's'
    } of mowing?`;
  }
  return `That was quick — save this ${formatShortDuration(activeSeconds)} mow?`;
}

/**
 * Format whole seconds compactly for prose, e.g. 100 -> "1m 40s", 45 -> "45s",
 * 0 -> "0s". Minutes are omitted when under a minute. Negatives/fractions are
 * clamped/floored.
 */
export function formatShortDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
