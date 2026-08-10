/**
 * Height-of-cut domain helpers. Pure and framework-free (no UI, no I/O) so the
 * range/step rules live in one tested place, shared by the input control, the
 * edit flow, and the log chip.
 *
 * HOC is measured in inches and constrained to a fixed range in quarter-inch
 * steps. A mow may have no HOC at all (the field is skippable), represented as
 * `undefined` — never a sentinel number.
 */

/** Smallest selectable height of cut, in inches. */
export const HOC_MIN = 0.5;
/** Largest selectable height of cut, in inches. */
export const HOC_MAX = 4.5;
/** Step between selectable heights, in inches. */
export const HOC_STEP = 0.25;
/** Seed value when the user sets a HOC with no prior history to default from. */
export const HOC_DEFAULT = 3;

/**
 * Clamp a raw value into the valid range and snap it to the nearest 0.25" step.
 * Guards against out-of-range or off-step numbers reaching persistence.
 */
export function clampHoc(inches: number): number {
  const snapped = Math.round(inches / HOC_STEP) * HOC_STEP;
  const bounded = Math.min(HOC_MAX, Math.max(HOC_MIN, snapped));
  // Kill binary-float noise (e.g. 0.30000000000000004) at the 0.25 grid.
  return Math.round(bounded * 100) / 100;
}

/**
 * Move one step up (`+1`) or down (`-1`) from `inches`, clamped to the range.
 * At a bound, stepping past it returns the bound unchanged.
 */
export function stepHoc(inches: number, direction: 1 | -1): number {
  return clampHoc(inches + direction * HOC_STEP);
}

/**
 * Format a height of cut for display, e.g. 2.5 -> `2.5"`, 3 -> `3"`,
 * 2.75 -> `2.75"`. Trailing zeros are trimmed.
 */
export function formatHoc(inches: number): string {
  const trimmed = Number(inches.toFixed(2)).toString();
  return `${trimmed}"`;
}

/** The minimal shape mostRecentHoc needs from a mow. */
export interface HocMow {
  hocInches?: number;
}

/**
 * The height of cut to default a new mow to: the most recently set HOC. Given a
 * newest-first list of mows (as the repository returns), this is the first mow
 * that has a `hocInches`. Returns `undefined` when no mow has one yet, so the
 * Save screen falls back to its "Set HOC" affordance.
 */
export function mostRecentHoc(mows: HocMow[]): number | undefined {
  for (const mow of mows) {
    if (typeof mow.hocInches === 'number' && Number.isFinite(mow.hocInches)) {
      return mow.hocInches;
    }
  }
  return undefined;
}
