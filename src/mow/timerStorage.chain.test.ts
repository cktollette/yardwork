import AsyncStorage from '@react-native-async-storage/async-storage';
import { activeDurationSeconds, pause, start, type TimerState } from './mowSegments';
import {
  CURRENT_TIMER_VERSION,
  RUNNING_TIMER_KEY,
  loadTimerState,
  saveTimerState,
} from './timerStorage';

// In-memory AsyncStorage mock shipped with the async-storage package.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

beforeEach(async () => {
  await AsyncStorage.clear();
});

const T0 = 1_700_000_000_000;

/**
 * Chain test for the timer blob (D-056 convention): every on-disk shape a real
 * device could still hold must load forward under the current loader. The oldest
 * such shape is v1 (a bare `startedAt` number string, shipped Jul 2026, pre-pause
 * PR #1); then the unversioned v2 object (#50); then the current `{ v, state }`
 * envelope. Seed each, load, assert an equivalent restored TimerState.
 */
describe('timer blob migration chain (oldest device shape -> current)', () => {
  it('v1 (pre-pause bare-number string) migrates to a running timer', async () => {
    // Exactly what the pre-pause build wrote: String(startedAt).
    await AsyncStorage.setItem(RUNNING_TIMER_KEY, String(T0));
    const restored = await loadTimerState();
    expect(restored).toEqual({ segments: [], runningSince: T0 });
    // Elapsed still derives from the timestamp, not a stored count.
    expect(activeDurationSeconds(restored as TimerState, T0 + 600_000)).toBe(600);
  });

  it('unversioned v2 (bare {segments, runningSince} object, #50) loads intact', async () => {
    const paused = pause(start(T0), T0 + 300_000); // 5 min active, then paused
    // The #50 build stored the bare state with no envelope.
    await AsyncStorage.setItem(RUNNING_TIMER_KEY, JSON.stringify(paused));
    const restored = await loadTimerState();
    expect(restored).toEqual(paused);
    expect(restored?.runningSince).toBeNull(); // still paused
    expect(activeDurationSeconds(restored as TimerState, T0 + 999_000)).toBe(300); // frozen
  });

  it('current v2 envelope round-trips (running and paused)', async () => {
    await saveTimerState(start(T0));
    expect(await loadTimerState()).toEqual({ segments: [], runningSince: T0 });

    const paused = pause(start(T0), T0 + 120_000);
    await saveTimerState(paused);
    expect(await loadTimerState()).toEqual(paused);

    // The write really is versioned (guards against silently dropping the envelope).
    const raw = await AsyncStorage.getItem(RUNNING_TIMER_KEY);
    expect(JSON.parse(raw as string).v).toBe(CURRENT_TIMER_VERSION);
  });
});
