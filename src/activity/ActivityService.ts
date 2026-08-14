/**
 * Activity capture boundary.
 *
 * All HealthKit access lives behind this interface. Screens, the mow repository,
 * and the capture orchestrator depend on THIS type only — never on the concrete
 * HealthKit library — so the source can be swapped without touching the rest of
 * the app. Mirrors the weather module's WeatherService boundary.
 */

/**
 * Steps + walking/running distance for a mow's timer window, captured once at
 * save time. Capture-only provenance (D-042): written by the capture path and
 * never edited, backfilled, or altered afterwards.
 */
export type Activity = {
  /** Total step count over the window (whole number). */
  steps: number;
  /** Total walking+running distance over the window, in miles (2 decimals). */
  distanceMi: number;
  /**
   * Active energy burned over the window, in whole kcal. A THIRD, strictly
   * optional metric (D-045 unchanged): attached opportunistically only when
   * present at capture time — its absence never blocks, delays, or fails an
   * attach, and is never retried on its own. Absent = not present at capture.
   */
  activeEnergyKcal?: number;
  /** HealthKit source name when available (e.g. "Apple Watch"); omitted otherwise. */
  source?: string;
  /** ISO-8601 timestamp of when the reading was captured. */
  capturedAt: string;
};

export interface ActivityService {
  /**
   * Steps + distance recorded within `[startMs, endMs]` (plus active energy when
   * present), or `null` when steps/distance are unavailable (permission denied,
   * query error, HealthKit init failure, or a window with zero steps AND zero
   * distance). Never throws — callers treat `null` as "no activity" and move on.
   * Calories are opportunistic and never affect this null/attach decision.
   */
  getActivityForWindow(startMs: number, endMs: number): Promise<Activity | null>;
}
