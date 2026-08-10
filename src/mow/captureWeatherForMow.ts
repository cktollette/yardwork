import * as Location from 'expo-location';
import { polygonCentroid } from '../lawn/centroid';
import { weatherService } from '../weather';
import { mowRepository, propertyRepository } from './asyncStorageRepositories';

/**
 * Best-effort weather capture for a just-saved mow.
 *
 * Called fire-and-forget AFTER the save has already succeeded — never awaited by
 * the save flow. It carries zero ability to block, delay, or fail a save: the
 * whole body is wrapped so it can never throw or reject into its caller, and
 * every "no data" branch returns silently.
 *
 * Weather is capture-only provenance (D-040): written once here, never in edits.
 */

/**
 * Refuse capture if more than this long has elapsed since the save. Because the
 * caller passes the invocation time, this guard is independent of whether mow
 * timestamps are start- or stop-based — it exists so no future code path can
 * misuse capture to backfill weather onto an old record.
 */
export const MAX_CAPTURE_AGE_MS = 30 * 60 * 1000;

/**
 * Resolve a coordinate to fetch weather for:
 *   1. the lawn polygon centroid, if a boundary exists (no permission needed); else
 *   2. the device's last known position, but ONLY if location permission is
 *      already granted — never trigger a new prompt here.
 * Returns null when neither source yields a coordinate.
 */
async function resolveCoordinates(): Promise<{ lat: number; lon: number } | null> {
  const property = await propertyRepository.getOrCreateDefault();
  const centroid = property.boundary ? polygonCentroid(property.boundary) : null;
  if (centroid) {
    const [lon, lat] = centroid;
    return { lat, lon };
  }

  // getForegroundPermissionsAsync checks without prompting; a non-granted status
  // (denied or undetermined) means we treat location as unavailable.
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status !== 'granted') return null;

  const last = await Location.getLastKnownPositionAsync();
  if (!last) return null;
  return { lat: last.coords.latitude, lon: last.coords.longitude };
}

export async function captureWeatherForMow(
  mowId: string,
  savedAtMs: number = Date.now(),
): Promise<void> {
  try {
    // Recency guard — never capture for a stale save.
    if (Date.now() - savedAtMs > MAX_CAPTURE_AGE_MS) return;

    const coords = await resolveCoordinates();
    if (!coords) return;

    const weather = await weatherService.getCurrentConditions(coords.lat, coords.lon);
    if (!weather) return;

    await mowRepository.attachWeather(mowId, weather);
  } catch {
    // Best-effort: any failure anywhere is swallowed so capture can never
    // surface an error into the save flow that scheduled it.
  }
}
