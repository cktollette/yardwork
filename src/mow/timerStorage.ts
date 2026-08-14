import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Segment, TimerState } from './mowSegments';

/**
 * Persistence for an in-progress (possibly paused) mow timer.
 *
 * We persist the whole TimerState — the closed segments plus `runningSince` —
 * because a paused mow has no single "started" instant. Active time is still
 * derived from timestamps (D-011), never stored as an accumulated count, so a
 * crash/force-quit loses nothing: a running timer restores its open interval, a
 * paused timer restores frozen.
 */
export const RUNNING_TIMER_KEY = '@yardwork/mow-timer/running';

/** Persist the current timer state. */
export async function saveTimerState(state: TimerState): Promise<void> {
  await AsyncStorage.setItem(RUNNING_TIMER_KEY, JSON.stringify(state));
}

/**
 * Load a persisted timer state, or `null` when there is no timer or the stored
 * value is missing/corrupt. Never throws — a bad value must not crash startup.
 *
 * Tolerant of the LEGACY format (pre-pause): a bare `startedAt` number restores
 * as a running, single-open-segment timer, so a mow in progress across the app
 * update isn't lost.
 */
export async function loadTimerState(): Promise<TimerState | null> {
  try {
    const raw = await AsyncStorage.getItem(RUNNING_TIMER_KEY);
    if (raw == null) return null;
    const parsed: unknown = JSON.parse(raw);

    // Legacy: a bare startedAt number = a running timer with one open interval.
    if (typeof parsed === 'number') {
      return Number.isFinite(parsed) && parsed > 0
        ? { segments: [], runningSince: parsed }
        : null;
    }
    return isValidTimerState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Clear the persisted timer (called on Finalize). */
export async function clearTimerState(): Promise<void> {
  await AsyncStorage.removeItem(RUNNING_TIMER_KEY);
}

/** Structural validation — a bad shape reads as "no timer". */
function isValidTimerState(value: unknown): value is TimerState {
  if (value == null || typeof value !== 'object') return false;
  const s = value as { segments?: unknown; runningSince?: unknown };
  if (!Array.isArray(s.segments)) return false;
  const runningOk =
    s.runningSince === null ||
    (typeof s.runningSince === 'number' && Number.isFinite(s.runningSince));
  if (!runningOk) return false;
  return s.segments.every((seg) => {
    const p = seg as Partial<Segment>;
    return (
      seg != null &&
      typeof seg === 'object' &&
      typeof p.startedAt === 'number' &&
      typeof p.endedAt === 'number'
    );
  });
}
