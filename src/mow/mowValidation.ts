/**
 * Soft validation for saving a mow. A mow shorter than the floor is probably a
 * mis-tap (timer started and stopped by accident), so we ask the user to
 * confirm rather than block — real short mows still save.
 */

/** Mows below this many seconds get a soft "that was quick" confirmation. */
export const MIN_MOW_DURATION_SECONDS = 180;

/**
 * Whether a mow of the given duration should prompt a short-mow confirmation.
 * Strictly less-than the floor: a mow of exactly the floor saves clean.
 */
export function needsShortMowConfirmation(durationSeconds: number): boolean {
  return durationSeconds < MIN_MOW_DURATION_SECONDS;
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
