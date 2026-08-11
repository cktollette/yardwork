/**
 * Activity capture boundary.
 *
 * All HealthKit access lives behind this interface. Screens, the mow repository,
 * and the capture orchestrator depend on THIS type only — never on
 * `react-native-health` — so the source can be swapped without touching the rest
 * of the app. Mirrors the weather module's WeatherService boundary.
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
  /** HealthKit source name when available (e.g. "Apple Watch"); omitted otherwise. */
  source?: string;
  /** ISO-8601 timestamp of when the reading was captured. */
  capturedAt: string;
};

export interface ActivityService {
  /**
   * Steps + distance recorded within `[startMs, endMs]`, or `null` when nothing
   * is available (permission denied, query error, HealthKit init failure, or a
   * window with zero steps AND zero distance). Never throws — callers treat
   * `null` as "no activity" and move on.
   */
  getActivityForWindow(startMs: number, endMs: number): Promise<Activity | null>;
}
