import {
  isHealthDataAvailable,
  queryQuantitySamples,
  requestAuthorization,
} from '@kingstinct/react-native-healthkit';
import type { Activity, ActivityService } from './ActivityService';

/**
 * HealthKit-backed ActivityService.
 *
 * The ONLY place `@kingstinct/react-native-healthkit` appears. HealthKit is
 * treated purely as an aggregator (D-043): we read step count and walking+
 * running distance for a window, sum the samples, and report totals — no
 * per-sample analysis, no other data types. Read-only authorization; write
 * scopes are never requested.
 *
 * Single query, no retry (D-045): a failed or empty read yields `null` and the
 * mow simply has no activity. Every failure mode — denied permission,
 * authorization failure, query error, empty window — collapses to `null`; never
 * throws.
 *
 * Because that null-collapse is deliberately silent in production, every
 * null-return path is instrumented with a `__DEV__`-gated `[activity]`
 * console.warn naming the path and its context (authorization result, per-query
 * sample counts, caught error). Production behavior is unchanged: still null,
 * still never throws — the logs only exist in dev builds so a device tester can
 * see *which* path fired.
 */

// `as const` so the literal identifier types bind, which in turn constrains the
// per-query `unit` to the right dimension ('count' for steps, 'mi' for distance).
const STEP_COUNT = 'HKQuantityTypeIdentifierStepCount' as const;
const DISTANCE = 'HKQuantityTypeIdentifierDistanceWalkingRunning' as const;

/** Dev-only diagnostic for the silent null paths. No-op in production. */
function warn(message: string): void {
  if (__DEV__) console.warn(`[activity] ${message}`);
}

/** Minimal structural shape of the fields we read off a quantity sample. */
type Sample = {
  readonly quantity: number;
  readonly sourceRevision?: { readonly source?: { readonly name?: string } };
};

/** Sum the `quantity` of every sample. */
function sumQuantities(samples: readonly Sample[]): number {
  return samples.reduce((total, s) => total + (typeof s.quantity === 'number' ? s.quantity : 0), 0);
}

/** First non-empty source name across samples (e.g. "Apple Watch"). */
function firstSource(samples: readonly Sample[]): string | undefined {
  for (const s of samples) {
    const name = s.sourceRevision?.source?.name;
    if (name) return name;
  }
  return undefined;
}

export class HealthKitActivityService implements ActivityService {
  /** Memoized: read authorization is requested once, on first capture. */
  private authPromise: Promise<boolean> | null = null;

  /**
   * Read-only authorization: step count and walking+running distance only.
   * Resolves to HealthKit's `requestAuthorization` result. NOTE: for READ
   * scopes iOS never reveals whether the user actually granted access, so this
   * boolean is not a reliable "granted" signal — it is logged for diagnostics
   * only, and we never gate the query on it.
   */
  private ensureAuthorization(): Promise<boolean> {
    if (!this.authPromise) {
      this.authPromise = requestAuthorization({ toRead: [STEP_COUNT, DISTANCE] }).catch(
        (error) => {
          // Reset so a later capture can retry a fresh authorization.
          this.authPromise = null;
          throw error;
        },
      );
    }
    return this.authPromise;
  }

  async getActivityForWindow(startMs: number, endMs: number): Promise<Activity | null> {
    try {
      if (!isHealthDataAvailable()) {
        warn('skip: HealthKit data is not available on this device');
        return null;
      }
      const authorized = await this.ensureAuthorization();

      // Query semantics verified against the native module (v14): limit 0 →
      // HKObjectQueryNoLimit (all samples, Helpers.swift); units 'count'/'mi'
      // match the type map; the window goes in as Date objects under
      // filter.date, which native turns into predicateForSamples(withStart:end:).
      const filter = { date: { startDate: new Date(startMs), endDate: new Date(endMs) } };
      const [steps, distance] = await Promise.all([
        queryQuantitySamples(STEP_COUNT, { filter, unit: 'count', limit: 0 }),
        queryQuantitySamples(DISTANCE, { filter, unit: 'mi', limit: 0 }),
      ]);

      const totalSteps = Math.round(sumQuantities(steps));
      const totalMiles = sumQuantities(distance);
      // A window with nothing in either metric isn't worth recording.
      if (totalSteps === 0 && totalMiles === 0) {
        warn(
          `skip: empty window — authorized=${authorized}, ` +
            `stepSamples=${steps.length}, distanceSamples=${distance.length}, ` +
            `window=[${new Date(startMs).toISOString()}, ${new Date(endMs).toISOString()}]`,
        );
        return null;
      }

      const source = firstSource(steps) ?? firstSource(distance);
      return {
        steps: totalSteps,
        distanceMi: Math.round(totalMiles * 100) / 100,
        ...(source ? { source } : {}),
        capturedAt: new Date().toISOString(),
      };
    } catch (error) {
      // Denied authorization, unavailable HealthKit, or a query error all land here.
      const e = error as { name?: string; message?: string } | null;
      warn(`skip: threw — ${e?.name ?? 'Error'}: ${e?.message ?? String(error)}`);
      return null;
    }
  }
}

/** Wired singleton — the app's ActivityService binding. */
export const activityService: ActivityService = new HealthKitActivityService();
