/**
 * Clippings-bags domain helpers. Pure and framework-free (no UI, no I/O) so the
 * range/step rules live in one tested place, shared by the input control and the
 * edit flow — the same shape as hoc.ts.
 *
 * A mow records an optional count of clippings bags collected. It is a whole
 * number in a fixed range. `undefined` means "not recorded" — the field is
 * skippable and never blocks a save. Unlike HOC, `0` IS a valid recorded value
 * (you mulched and bagged nothing), distinct from unset — so the seed/guard code
 * must test for a number, never truthiness.
 */

/** Smallest recordable number of bags. Zero is a real, recorded value. */
export const BAGS_MIN = 0;
/** Largest recordable number of bags. */
export const BAGS_MAX = 20;
/** Step between selectable counts. */
export const BAGS_STEP = 1;
/** Seed value when the user adds bags with no prior history to default from. */
export const BAGS_DEFAULT = 1;

/**
 * Clamp a raw value into the valid range and round it to a whole bag count.
 * Guards against out-of-range or fractional numbers reaching persistence.
 */
export function clampBags(count: number): number {
  const rounded = Math.round(count);
  return Math.min(BAGS_MAX, Math.max(BAGS_MIN, rounded));
}

/**
 * Move one step up (`+1`) or down (`-1`) from `count`, clamped to the range.
 * At a bound, stepping past it returns the bound unchanged.
 */
export function stepBags(count: number, direction: 1 | -1): number {
  return clampBags(count + direction * BAGS_STEP);
}

/**
 * Format a bag count for display, e.g. 0 -> `0 bags`, 1 -> `1 bag`,
 * 3 -> `3 bags`. Used for the input's accessibility label.
 */
export function formatBags(count: number): string {
  return `${count} ${count === 1 ? 'bag' : 'bags'}`;
}

/** The minimal shape mostRecentBags needs from a mow. */
export interface BagsMow {
  clippingBags?: number;
}

/**
 * The bag count of the most recently logged mow that recorded one. Given a
 * newest-first list of mows (as the repository returns), returns the first mow
 * whose `clippingBags` is a finite number, or `undefined` when none recorded
 * bags. Used to seed the "Add bags" affordance (seed-on-tap) — NOT to pre-fill
 * the field, which starts unset. Tests for a number (not truthiness) so a prior
 * value of `0` seeds `0`.
 */
export function mostRecentBags(mows: BagsMow[]): number | undefined {
  for (const mow of mows) {
    if (typeof mow.clippingBags === 'number' && Number.isFinite(mow.clippingBags)) {
      return mow.clippingBags;
    }
  }
  return undefined;
}
