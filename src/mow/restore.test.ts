import AsyncStorage from '@react-native-async-storage/async-storage';
import { computeElapsedSeconds } from './timer';
import {
  RUNNING_TIMER_KEY,
  clearRunningTimer,
  loadRunningTimer,
  saveRunningTimer,
} from './timerStorage';

// In-memory AsyncStorage mock shipped with the async-storage package.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('restoring a running timer from persistence', () => {
  it('round-trips a startedAt so the timer resumes as running', async () => {
    const startedAt = 1_700_000_000_000;
    await saveRunningTimer(startedAt);

    // Simulate app relaunch: only the persisted value survives.
    const restored = await loadRunningTimer();
    expect(restored).toBe(startedAt);
    expect(restored).not.toBeNull(); // non-null => timer is considered running
  });

  it('restores full elapsed time after the app was closed for 40+ minutes', async () => {
    const startedAt = 1_700_000_000_000;
    await saveRunningTimer(startedAt);

    // App was killed; 41 minutes pass; app relaunches.
    const now = startedAt + 41 * 60 * 1000;

    const restored = await loadRunningTimer();
    expect(restored).toBe(startedAt);
    // Elapsed is derived from the restored startedAt, not from any tick count,
    // so no time is lost across the closure.
    expect(computeElapsedSeconds(restored as number, now)).toBe(2460); // 41 * 60
  });

  it('returns null (no timer) when nothing is persisted', async () => {
    expect(await loadRunningTimer()).toBeNull();
  });

  it('returns null and does not throw on corrupt / non-numeric persisted data', async () => {
    // Directly plant garbage under the key, as a corrupted write might.
    await AsyncStorage.setItem(RUNNING_TIMER_KEY, 'not-a-number');
    await expect(loadRunningTimer()).resolves.toBeNull();

    await AsyncStorage.setItem(RUNNING_TIMER_KEY, '{"lol":true}');
    await expect(loadRunningTimer()).resolves.toBeNull();

    await AsyncStorage.setItem(RUNNING_TIMER_KEY, '');
    await expect(loadRunningTimer()).resolves.toBeNull();
  });

  it('clears the persisted timer on stop', async () => {
    await saveRunningTimer(1_700_000_000_000);
    await clearRunningTimer();
    expect(await loadRunningTimer()).toBeNull();
  });
});
