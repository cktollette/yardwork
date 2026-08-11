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
 */

/**
 * Minimum timer window that earns an activity read. A mow shorter than this has
 * no meaningful step/distance window to attribute.
 */
export const MIN_WINDOW_MS = 60 * 1000;

export async function captureActivityForMow(
  mow: Pick<Mow, 'id'> & { startedAt?: number; endedAt?: number },
): Promise<void> {
  try {
    const { id, startedAt, endedAt } = mow;

    // Window guard, NOT a clock guard (D-044): capture only when the mow has a
    // genuine timer window — both bounds present and at least MIN_WINDOW_MS
    // apart. HealthKit is a historical source, so the window itself is the
    // correct gate; there is deliberately no elapsed-since-save recency check.
    if (startedAt == null || endedAt == null) return;
    if (endedAt - startedAt < MIN_WINDOW_MS) return;

    const activity = await activityService.getActivityForWindow(startedAt, endedAt);
    if (!activity) return;

    await mowRepository.attachActivity(id, activity);
  } catch {
    // Best-effort: any failure anywhere is swallowed so capture can never
    // surface an error into the save flow that scheduled it.
  }
}
