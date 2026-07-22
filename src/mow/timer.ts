/**
 * Pure, framework-free mow-timer logic.
 *
 * Timing rule (v0 spec): elapsed time is ALWAYS derived as `now - startedAt`.
 * We never accumulate ticks, so a dropped/misfired interval or a crash can
 * never lose or corrupt the elapsed count.
 */

/** A completed mow, produced on Stop and handed to the save stub. */
export interface DraftMow {
  /** epoch ms when the mow started */
  startedAt: number;
  /** epoch ms when the mow ended */
  endedAt: number;
  /** whole seconds elapsed, floored and clamped to >= 0 */
  durationSeconds: number;
}

/**
 * Whole seconds between `startedAt` and `now`.
 *
 * Floored to whole seconds. Clamped to >= 0 so backwards clock skew
 * (now < startedAt) yields 0 rather than a negative display.
 */
export function computeElapsedSeconds(startedAt: number, now: number): number {
  return Math.max(0, Math.floor((now - startedAt) / 1000));
}

/** Build the draft mow object from start/end timestamps. */
export function buildDraftMow(startedAt: number, endedAt: number): DraftMow {
  return {
    startedAt,
    endedAt,
    durationSeconds: computeElapsedSeconds(startedAt, endedAt),
  };
}
