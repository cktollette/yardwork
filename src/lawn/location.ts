import type { Position } from '../mow/models';

/**
 * Pure, device-free helpers for the create-mode "center on user location"
 * flow. Deliberately imports NOTHING from expo-location so these stay unit
 * testable without a device — the screen's effect is the impure shell that
 * calls the real APIs and feeds their results through these functions.
 */

// Mirrors expo-location's PermissionStatus values without importing the module.
export type PermissionGate = 'granted' | 'denied' | 'undetermined';

// getCurrentPositionAsync can hang (e.g. no signal), so we race it against this
// timeout and fall back silently. Named so tests can reference the exact value.
export const CURRENT_POSITION_TIMEOUT_MS = 6000;

/**
 * The entire permission branch as a pure decision:
 *   - granted      → 'proceed'  (use location)
 *   - undetermined → 'request'  (ask once)
 *   - denied       → 'fallback' (silent DEFAULT_CENTER, never re-prompt)
 *
 * Reused after a request resolves: a granted result yields 'proceed', anything
 * else yields 'fallback'.
 */
export function decideLocationFlow(status: PermissionGate): 'proceed' | 'request' | 'fallback' {
  switch (status) {
    case 'granted':
      return 'proceed';
    case 'undetermined':
      return 'request';
    default:
      return 'fallback';
  }
}

/**
 * Turn a location reading into a [lon, lat] camera center, or the fallback when
 * there is no reading (null last-known, unavailable, etc.).
 */
export function pickCameraCenter(
  coords: { longitude: number; latitude: number } | null | undefined,
  fallback: Position,
): Position {
  if (!coords) return fallback;
  return [coords.longitude, coords.latitude];
}

/**
 * Race a promise against a timeout. Rejects with a timeout error if `ms`
 * elapses first; the underlying promise is left to settle harmlessly.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
