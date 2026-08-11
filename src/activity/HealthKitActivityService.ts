import AppleHealthKit, {
  HealthInputOptions,
  HealthKitPermissions,
  HealthUnit,
  HealthValue,
} from 'react-native-health';
import type { Activity, ActivityService } from './ActivityService';

/**
 * HealthKit-backed ActivityService.
 *
 * The ONLY place `react-native-health` appears. HealthKit is treated purely as
 * an aggregator (D-043): we read step count and walking+running distance for a
 * window, sum the samples, and report totals — no per-sample analysis, no other
 * data types. Read-only scopes; no write permissions are ever requested.
 *
 * Single query, no retry (D-045): a failed or empty read yields `null` and the
 * mow simply has no activity. Every failure mode — denied permission, init
 * failure, query error, empty window — collapses to `null`; never throws.
 */

/** A window sample, plus the optional source name HealthKit may attach. */
type Sample = HealthValue & { sourceName?: string };

/** Sum the numeric `value` of every sample. */
function sumValues(samples: Sample[]): number {
  return samples.reduce((total, s) => total + (typeof s.value === 'number' ? s.value : 0), 0);
}

/** First non-empty source name across samples (sample field, then metadata). */
function firstSource(samples: Sample[]): string | undefined {
  for (const s of samples) {
    const fromMeta = s.metadata?.sourceName;
    const name = s.sourceName ?? (typeof fromMeta === 'string' ? fromMeta : undefined);
    if (name) return name;
  }
  return undefined;
}

export class HealthKitActivityService implements ActivityService {
  /** Memoized init: HealthKit permissions are requested once, on first capture. */
  private initPromise: Promise<void> | null = null;

  /** Read-only scopes: step count and walking+running distance. Nothing else. */
  private permissions(): HealthKitPermissions {
    return {
      permissions: {
        read: [
          AppleHealthKit.Constants.Permissions.Steps,
          AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
        ],
        write: [],
      },
    };
  }

  private ensureInit(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = new Promise<void>((resolve, reject) => {
        AppleHealthKit.initHealthKit(this.permissions(), (error) => {
          if (error) {
            // Reset so a later capture can retry a fresh init.
            this.initPromise = null;
            reject(new Error(String(error)));
          } else {
            resolve();
          }
        });
      });
    }
    return this.initPromise;
  }

  private stepSamples(options: HealthInputOptions): Promise<Sample[]> {
    return new Promise((resolve, reject) => {
      AppleHealthKit.getDailyStepCountSamples(options, (error, results) => {
        if (error) reject(new Error(String(error)));
        else resolve((results ?? []) as Sample[]);
      });
    });
  }

  private distanceSamples(options: HealthInputOptions): Promise<Sample[]> {
    return new Promise((resolve, reject) => {
      AppleHealthKit.getDailyDistanceWalkingRunningSamples(options, (error, results) => {
        if (error) reject(new Error(String(error)));
        else resolve((results ?? []) as Sample[]);
      });
    });
  }

  async getActivityForWindow(startMs: number, endMs: number): Promise<Activity | null> {
    try {
      await this.ensureInit();

      const window: HealthInputOptions = {
        startDate: new Date(startMs).toISOString(),
        endDate: new Date(endMs).toISOString(),
      };
      const [steps, distance] = await Promise.all([
        this.stepSamples(window),
        this.distanceSamples({ ...window, unit: HealthUnit.mile }),
      ]);

      const totalSteps = Math.round(sumValues(steps));
      const totalMiles = sumValues(distance);
      // A window with nothing in either metric isn't worth recording.
      if (totalSteps === 0 && totalMiles === 0) return null;

      const source = firstSource(steps) ?? firstSource(distance);
      return {
        steps: totalSteps,
        distanceMi: Math.round(totalMiles * 100) / 100,
        ...(source ? { source } : {}),
        capturedAt: new Date().toISOString(),
      };
    } catch {
      // Denied permission, init failure, or a query error all land here.
      return null;
    }
  }
}

/** Wired singleton — the app's ActivityService binding. */
export const activityService: ActivityService = new HealthKitActivityService();
