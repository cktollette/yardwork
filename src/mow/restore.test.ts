import AsyncStorage from '@react-native-async-storage/async-storage';
import { activeDurationSeconds, pause, start, type TimerState } from './mowSegments';
import {
  RUNNING_TIMER_KEY,
  clearTimerState,
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

describe('restoring a running timer', () => {
  it('round-trips a running state; elapsed derives from the open interval', async () => {
    await saveTimerState(start(T0));
    const restored = await loadTimerState();
    expect(restored).toEqual({ segments: [], runningSince: T0 });
    // App was killed; 41 minutes pass; elapsed is derived, not a stored count.
    expect(activeDurationSeconds(restored as TimerState, T0 + 41 * 60 * 1000)).toBe(2460);
  });
});

describe('restoring a PAUSED timer (survives app kill, frozen)', () => {
  it('restores frozen active duration independent of now', async () => {
    const paused = pause(start(T0), T0 + 300_000); // 5 min active, then paused
    await saveTimerState(paused);
    const restored = await loadTimerState();
    expect(restored?.runningSince).toBeNull(); // paused
    expect(activeDurationSeconds(restored as TimerState, T0 + 999_000)).toBe(300); // frozen
  });
});

describe('legacy format tolerance', () => {
  it('restores a bare startedAt number as a running single-open-segment timer', async () => {
    // Exactly what the pre-pause build wrote: String(startedAt).
    await AsyncStorage.setItem(RUNNING_TIMER_KEY, String(T0));
    const restored = await loadTimerState();
    expect(restored).toEqual({ segments: [], runningSince: T0 });
  });
});

describe('empty / corrupt / cleared', () => {
  it('returns null when nothing is persisted', async () => {
    expect(await loadTimerState()).toBeNull();
  });

  it('returns null and does not throw on corrupt data', async () => {
    for (const bad of ['not-a-number', '', '{"lol":true}', '{"segments":"x"}', '0']) {
      await AsyncStorage.setItem(RUNNING_TIMER_KEY, bad);
      await expect(loadTimerState()).resolves.toBeNull();
    }
  });

  it('clears the persisted timer', async () => {
    await saveTimerState(start(T0));
    await clearTimerState();
    expect(await loadTimerState()).toBeNull();
  });
});
