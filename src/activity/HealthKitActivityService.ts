import {
  isHealthDataAvailable,
  queryStatisticsForQuantity,
  requestAuthorization,
} from '@kingstinct/react-native-healthkit';
import type { Activity, ActivityService } from './ActivityService';

/**
 * HealthKit-backed ActivityService.
 *
 * The ONLY place `@kingstinct/react-native-healthkit` appears. HealthKit is
 * treated purely as an aggregator (D-043): we read step count and walking+
 * running distance for a window and report totals — no per-sample analysis, no
 * other data types. Read-only authorization; write scopes are never requested.
 *
 * Totals come from a STATISTICS cumulative-sum query (HKStatisticsQuery), NOT a
 * raw-sample sum. This matters for users with overlapping sources — an iPhone
 * plus an Apple Watch or a Garmin all writing step/distance samples for the same
 * window: summing raw samples double-counts the overlap, whereas the cumulative
 * statistic resolves it using Health's source-priority de-duplication and returns
 * one correct total per metric.
 *
 * Single query, no retry (D-045): a failed or empty read yields `null` and the
 * mow simply has no activity. Every failure mode — denied permission,
 * authorization failure, query error, empty window — collapses to `null`; never
 * throws.
 *
 * Because that null-collapse is deliberately silent in production, every
 * null-return path is instrumented with a `__DEV__`-gated `[activity]`
 * console.warn naming the path and its context (authorization result, per-metric
 * totals + source counts, caught error). Production behavior is unchanged: still
 * null, still never throws — the logs only exist in dev builds so a device tester
 * can see *which* path fired.
 */

// `as const` so the literal identifier types bind, which in turn constrains the
// per-query `unit` to the right dimension ('count' for steps, 'mi' for distance).
const STEP_COUNT = 'HKQuantityTypeIdentifierStepCount' as const;
const DISTANCE = 'HKQuantityTypeIdentifierDistanceWalkingRunning' as const;
const ACTIVE_ENERGY = 'HKQuantityTypeIdentifierActiveEnergyBurned' as const;

// The single statistic we ask for: the source-priority-deduplicated sum.
const CUMULATIVE_SUM = ['cumulativeSum'] as const;

/** Dev-only diagnostic for the silent null paths. No-op in production. */
function warn(message: string): void {
  if (__DEV__) console.warn(`[activity] ${message}`);
}

/** Minimal structural shape of the statistics fields we read. */
type Stats = {
  readonly sumQuantity?: { readonly quantity?: number };
  readonly sources?: readonly { readonly name?: string }[];
};

/** The deduplicated cumulative total, or 0 when the window had no samples. */
function total(stats: Stats | null | undefined): number {
  const q = stats?.sumQuantity?.quantity;
  return typeof q === 'number' ? q : 0;
}

/** First non-empty contributing source name (e.g. "Apple Watch"), cosmetic. */
function firstSourceName(stats: Stats | null | undefined): string | undefined {
  for (const s of stats?.sources ?? []) {
    if (s?.name) return s.name;
  }
  return undefined;
}

export class HealthKitActivityService implements ActivityService {
  /** Memoized: read authorization is requested once, on first capture. */
  private authPromise: Promise<boolean> | null = null;

  /**
   * Read-only authorization: step count, walking+running distance, and active
   * energy (calories). Resolves to HealthKit's `requestAuthorization` result.
   * NOTE: for READ scopes iOS never reveals whether the user actually granted
   * access, so this boolean is not a reliable "granted" signal — it is logged
   * for diagnostics only, and we never gate the query on it.
   */
  private ensureAuthorization(): Promise<boolean> {
    if (!this.authPromise) {
      this.authPromise = requestAuthorization({
        toRead: [STEP_COUNT, DISTANCE, ACTIVE_ENERGY],
      }).catch(
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

      // A cumulative-sum statistic over the window. The date filter goes in as
      // Date objects under filter.date, which native turns into
      // predicateForSamples(withStart:end:); HKStatisticsQuery then returns the
      // source-priority-deduplicated sum (overlapping iPhone/Watch/Garmin samples
      // are resolved, not double-counted).
      const filter = { date: { startDate: new Date(startMs), endDate: new Date(endMs) } };
      const [stepStats, distStats, energyStats] = await Promise.all([
        queryStatisticsForQuantity(STEP_COUNT, CUMULATIVE_SUM, { filter, unit: 'count' }),
        queryStatisticsForQuantity(DISTANCE, CUMULATIVE_SUM, { filter, unit: 'mi' }),
        // Calories is a THIRD, strictly OPPORTUNISTIC metric (D-045 unchanged):
        // its query must never fail the attach, so it can't reject the batch. A
        // rejection is swallowed to null — but LOGGED (D-056 tolerant-read style),
        // so a persistently failing calorie query is observable in dev rather than
        // silently producing calorie-less captures forever. Never blocks, never
        // retries.
        queryStatisticsForQuantity(ACTIVE_ENERGY, CUMULATIVE_SUM, { filter, unit: 'kcal' }).catch(
          (error: unknown) => {
            const e = error as { name?: string; message?: string } | null;
            warn(`calories statistics threw (omitting calories) — ${e?.name ?? 'Error'}: ${e?.message ?? String(error)}`);
            return null;
          },
        ),
      ]);

      const totalSteps = Math.round(total(stepStats));
      const totalMiles = total(distStats);
      const distanceMi = Math.round(totalMiles * 100) / 100;
      const activeEnergyKcal = Math.round(total(energyStats));

      // Require BOTH metrics before attaching. Step count and walking/running
      // distance are SEPARATE HealthKit quantities whose samples the iPhone's
      // own pedometer flushes on INDEPENDENT schedules — one can commit minutes
      // before the other. A partial like steps=0/distanceMi=0.1 is flush lag,
      // not truth: a genuine 3-minute walking mow always produces both. So a
      // zero in either metric is treated as "not flushed yet" — return null and
      // let the retry schedule try again (revised D-045) rather than lock in a
      // misleading partial. (Edge accepted: a rare genuinely zero-distance mow —
      // tiny yard, mower barely moving — is sacrificed rather than surface a
      // "0 steps" partial to testers during recruiting.)
      if (totalSteps === 0 || totalMiles === 0) {
        warn(
          `skip: partial/empty window — authorized=${authorized}, ` +
            `steps=${totalSteps} (${stepStats.sources?.length ?? 0} sources), ` +
            `distanceMi=${distanceMi} (${distStats.sources?.length ?? 0} sources), ` +
            `window=[${new Date(startMs).toISOString()}, ${new Date(endMs).toISOString()}]`,
        );
        return null;
      }

      const source = firstSourceName(stepStats) ?? firstSourceName(distStats);
      warn(
        `read: steps=${totalSteps} distanceMi=${distanceMi} ` +
          `activeEnergyKcal=${activeEnergyKcal} source=${source ?? 'unknown'}`,
      );
      // Calories attaches only when present; its absence is a complete, successful
      // capture (steps+distance already passed the D-045 gate above).
      return {
        steps: totalSteps,
        distanceMi,
        ...(activeEnergyKcal > 0 ? { activeEnergyKcal } : {}),
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
