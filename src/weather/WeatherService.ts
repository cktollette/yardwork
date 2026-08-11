/**
 * Weather capture boundary.
 *
 * All network access for weather lives behind this interface. Screens, the mow
 * repository, and the capture orchestrator depend on THIS type only — never on
 * `fetch` or any OpenWeather specifics — so the provider can be swapped without
 * touching the rest of the app.
 */

/**
 * A point-in-time weather reading, captured once when a mow is saved.
 * Capture-only provenance (D-040): written by the capture path and never edited,
 * backfilled, or altered afterwards.
 */
export type Weather = {
  /** Temperature in °F, rounded to a whole number. */
  tempF: number;
  /** Short condition label from OpenWeather's `weather[0].main` (e.g. "Clear"). */
  condition: string;
  /** Relative humidity as a whole-number percent. */
  humidity: number;
  /** ISO-8601 timestamp of when the reading was captured. */
  capturedAt: string;
};

export interface WeatherService {
  /**
   * Current conditions for a coordinate, or `null` when no reading is available
   * (missing key, non-200, timeout, network error, malformed response).
   * Never throws — callers treat `null` as "no weather" and move on.
   */
  getCurrentConditions(lat: number, lon: number): Promise<Weather | null>;
}
