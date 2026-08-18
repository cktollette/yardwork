import type { Position } from '../mow/models';
import type { GeocodeResult, GeocodingService } from './GeocodingService';

/**
 * Mapbox-backed GeocodingService (v6 forward geocoding).
 *
 * The ONLY place `fetch` and Mapbox's request/response shape appear. Every
 * failure mode — missing token, non-200, timeout, network rejection, malformed
 * body — collapses to `[]`; this service never throws, so the draw screen's
 * fallback-to-manual-pan stays trivial.
 *
 * TEMPORARY tier: no `permanent` flag is sent, so results must not be stored.
 * We fly the camera to a pick and discard it (home addresses are PII we choose
 * not to hold).
 */

const ENDPOINT = 'https://api.mapbox.com/search/geocode/v6/forward';
const RESULT_LIMIT = 5;

/** Abort the request if Mapbox hasn't answered within this budget. */
const TIMEOUT_MS = 5000;

/** Dev-only diagnostic for the silent empty-result paths. No-op in production. */
function warn(message: string): void {
  if (__DEV__) console.warn(`[geocoding] ${message}`);
}

/** Parse a v6 FeatureCollection into GeocodeResults, dropping malformed features. */
function parseResults(data: unknown): GeocodeResult[] {
  if (typeof data !== 'object' || data === null) return [];
  const features = (data as { features?: unknown }).features;
  if (!Array.isArray(features)) return [];

  const results: GeocodeResult[] = [];
  for (const feature of features) {
    if (typeof feature !== 'object' || feature === null) continue;
    const f = feature as {
      geometry?: { coordinates?: unknown };
      properties?: { full_address?: unknown; name?: unknown };
    };
    const coords = f.geometry?.coordinates;
    if (
      !Array.isArray(coords) ||
      coords.length < 2 ||
      typeof coords[0] !== 'number' ||
      typeof coords[1] !== 'number' ||
      !Number.isFinite(coords[0]) ||
      !Number.isFinite(coords[1])
    ) {
      continue;
    }
    const label = f.properties?.full_address ?? f.properties?.name;
    if (typeof label !== 'string' || label.length === 0) continue;
    results.push({ label, center: [coords[0], coords[1]] as Position });
  }
  return results;
}

export class MapboxGeocodingService implements GeocodingService {
  async forwardGeocode(
    query: string,
    opts?: { signal?: AbortSignal },
  ): Promise<GeocodeResult[]> {
    const token = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token) {
      warn('skip: no EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN set');
      return [];
    }

    // Bound the request so a hung network can never stall the draw flow. Chain
    // any caller-supplied signal so a superseded search can be cancelled too.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const onExternalAbort = () => controller.abort();
    if (opts?.signal) {
      if (opts.signal.aborted) controller.abort();
      else opts.signal.addEventListener('abort', onExternalAbort);
    }

    try {
      const url =
        `${ENDPOINT}?q=${encodeURIComponent(query)}` +
        `&limit=${RESULT_LIMIT}&access_token=${token}`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        warn(`skip: non-200 response (${res.status})`);
        return [];
      }
      const data = await res.json();
      return parseResults(data);
    } catch (error) {
      const e = error as { name?: string; message?: string } | null;
      if (e?.name === 'AbortError') warn(`skip: aborted or timed out after ${TIMEOUT_MS}ms`);
      else warn(`skip: request failed — ${e?.name ?? 'Error'}: ${e?.message ?? String(error)}`);
      return [];
    } finally {
      clearTimeout(timer);
      opts?.signal?.removeEventListener('abort', onExternalAbort);
    }
  }
}

/** Wired singleton — the app's GeocodingService binding. */
export const geocodingService: GeocodingService = new MapboxGeocodingService();
