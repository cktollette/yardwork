import type { Mow } from '../mow/models';
import { mowRepository } from '../mow/asyncStorageRepositories';
import { activityService } from './HealthKitActivityService';

/**
 * Best-effort activity capture for a just-saved mow.
 *
 * Called fire-and-forget AFTER the save has already succeeded — never awaited by
 * the save flow. It carries zero ability to block, delay, or fail a save: the
 * whole body is wrapped so it can never throw or reject into its caller, and
 * every "no data" branch returns silently. Mirrors captureWeatherForMow.
 *
 * Activity is capture-only provenance (D-042): written once here, never in edits.
 *
 * Bounded retry (revised D-045): the iPhone's own pedometer flushes its step
 * data to HealthKit lazily — minutes after the fact — so a query fired the
 * instant the mow is saved routinely finds an empty window even though steps
 * exist (confirmed on device: authorized=true, valid window, zero samples). So
 * instead of a single query we retry on a schedule: at save, then +2 min and
 * +5 min (three attempts). The first attempt that returns data attaches and
 * stops the schedule; if all attempts come back empty we attach nothing — the
 * same silent outcome as before. Implemented with plain setTimeout chains inside
 * the never-throws wrapper: no background-task API, no daemon, no persistence.
 * If the app is killed before a retry fires, that capture is simply lost (same
 * loss semantics as today; the common case — pocketing the phone after saving —
 * keeps the JS alive long enough).
 */

/**
 * Minimum timer window that earns an activity read. A mow shorter than this has
 * no meaningful step/distance window to attribute.
 */
export const MIN_WINDOW_MS = 60 * 1000;

/**
 * Retry offsets from save, in ms, for attempts 2..N (attempt 1 fires
 * immediately). [+2 min, +5 min] gives the phone's pedometer time to flush.
 */
export const RETRY_OFFSETS_MS = [2 * 60 * 1000, 5 * 60 * 1000];

/** Total attempts = the immediate one plus one per retry offset. */
const TOTAL_ATTEMPTS = RETRY_OFFSETS_MS.length + 1;

/** Dev-only diagnostic, prefixed for grep. No-op in production. */
function warn(message: string): void {
  if (__DEV__) console.warn(`[activity] ${message}`);
}

export async function captureActivityForMow(
  mow: Pick<Mow, 'id'> & { startedAt?: number; endedAt?: number },
): Promise<void> {
  try {
    const { id, startedAt, endedAt } = mow;

    // Window guard, NOT a clock guard (D-044): gate ONCE at invocation — both
    // bounds present and at least MIN_WINDOW_MS apart. Retries reuse this
    // already-validated window; HealthKit is historical, so no recency check.
    if (startedAt == null || endedAt == null) return;
    if (endedAt - startedAt < MIN_WINDOW_MS) return;

    // One attempt: query the window, attach if data is present. Never throws;
    // returns true iff activity was attached.
    const attempt = async (attemptNumber: number): Promise<boolean> => {
      try {
        const activity = await activityService.getActivityForWindow(startedAt, endedAt);
        if (!activity) {
          warn(`attempt ${attemptNumber}/${TOTAL_ATTEMPTS}: window still empty`);
          return false;
        }
        // attachActivity runs through the repository write queue, which
        // serializes it against any concurrent user edit — both survive.
        await mowRepository.attachActivity(id, activity);
        warn(
          `attempt ${attemptNumber}/${TOTAL_ATTEMPTS}: attached ` +
            `steps=${activity.steps} distanceMi=${activity.distanceMi}`,
        );
        return true;
      } catch {
        warn(`attempt ${attemptNumber}/${TOTAL_ATTEMPTS}: threw, treating as no data`);
        return false;
      }
    };

    // Schedule retry at RETRY_OFFSETS_MS[retryIndex] measured from save. We chain
    // via the delta from the previous offset so a killed app just drops the
    // pending timer (no persistence). Not scheduling the next attempt IS how the
    // schedule stops once one succeeds.
    const scheduleRetry = (retryIndex: number): void => {
      if (retryIndex >= RETRY_OFFSETS_MS.length) {
        warn(`giving up after ${TOTAL_ATTEMPTS} attempts — no HealthKit data flushed for the window`);
        return;
      }
      const prevOffset = retryIndex === 0 ? 0 : RETRY_OFFSETS_MS[retryIndex - 1];
      const delay = RETRY_OFFSETS_MS[retryIndex] - prevOffset;
      setTimeout(() => {
        void (async () => {
          const attached = await attempt(retryIndex + 2); // attempts 2, 3, ...
          if (!attached) scheduleRetry(retryIndex + 1);
        })();
      }, delay);
    };

    const attached = await attempt(1);
    if (!attached) scheduleRetry(0);
  } catch {
    // Best-effort: any failure anywhere is swallowed so capture can never
    // surface an error into the save flow that scheduled it.
  }
}
