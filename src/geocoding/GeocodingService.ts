import type { Position } from '../mow/models';

/**
 * Forward-geocoding boundary.
 *
 * All network access for address search lives behind this interface. The draw
 * screen depends on THIS type only — never on `fetch` or any Mapbox specifics —
 * so the provider can be swapped or mocked without touching the screen.
 */

/** A single geocode candidate: a label to show and a center to fly the camera to. */
export type GeocodeResult = {
  /** Human-readable place label for the results list (e.g. a full address). */
  label: string;
  /** [lon, lat] center of the match, fed to the controlled camera. */
  center: Position;
};

export interface GeocodingService {
  /**
   * Forward-geocode free-text into candidate locations, or `[]` when no result
   * is available (missing token, non-200, timeout, network error, malformed
   * response). Never throws — callers treat `[]` as "no match" and fall back to
   * manual panning.
   *
   * TEMPORARY geocoding (results are not stored); callers must not persist the
   * query or the returned coordinates.
   */
  forwardGeocode(query: string, opts?: { signal?: AbortSignal }): Promise<GeocodeResult[]>;
}
