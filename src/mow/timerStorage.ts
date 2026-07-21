import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Persistence for an in-progress mow timer.
 *
 * We persist only `startedAt` (a single epoch-ms number). Because elapsed
 * time is always recomputed as `now - startedAt`, restoring after a
 * force-quit or crash needs nothing more than this one value.
 */
export const RUNNING_TIMER_KEY = '@yardwork/mow-timer/running';

/** Persist the start timestamp of a running timer. */
export async function saveRunningTimer(startedAt: number): Promise<void> {
  await AsyncStorage.setItem(RUNNING_TIMER_KEY, String(startedAt));
}

/**
 * Load a persisted running-timer start timestamp.
 *
 * Returns `null` when there is no running timer OR the stored value is
 * missing/corrupt/non-numeric. Never throws — a bad value must not crash
 * app startup; it simply means "no timer to restore".
 */
export async function loadRunningTimer(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(RUNNING_TIMER_KEY);
    if (raw == null) return null;
    const parsed = Number(raw);
    // Reject NaN/Infinity and non-positive values (a real epoch is large + positive).
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Clear the persisted running timer (called on Stop). */
export async function clearRunningTimer(): Promise<void> {
  await AsyncStorage.removeItem(RUNNING_TIMER_KEY);
}
