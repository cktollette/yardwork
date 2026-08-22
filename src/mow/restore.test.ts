import AsyncStorage from '@react-native-async-storage/async-storage';
import { activeDurationSeconds, pause, start, type TimerState } from './mowSegments';
import {
  RUNNING_TIMER_KEY,
  UNRECOVERABLE_TIMER_KEY,
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

describe('empty / degenerate / cleared', () => {
  it('returns null when nothing is persisted', async () => {
    expect(await loadTimerState()).toBeNull();
  });

  it('treats empty and degenerate-number values as "no timer" (not corrupt)', async () => {
    // These are meaningless-but-harmless markers, not structured-but-invalid data;
    // keep the old contract (null, no throw) AND do not quarantine them.
    for (const degenerate of ['', '   ', '0', '-1']) {
      await AsyncStorage.setItem(RUNNING_TIMER_KEY, degenerate);
      await expect(loadTimerState()).resolves.toBeNull();
      expect(await AsyncStorage.getItem(UNRECOVERABLE_TIMER_KEY)).toBeNull();
    }
  });

  it('clears the persisted timer', async () => {
    await saveTimerState(start(T0));
    await clearTimerState();
    expect(await loadTimerState()).toBeNull();
  });
});

describe('corrupt in-progress blob is quarantined, not silently dropped', () => {
  // REGRESSION PIN (fails on main). Honest scope: a VALID paused blob already
  // restores on main, so the reported "fresh timer after a mid-pause kill" is not
  // reproducible from a well-formed blob. The real, reproducible gap is the
  // CORRUPT path: on main a corrupt blob loads as null and is lost with no trace;
  // here it must be copied to the quarantine slot (never deleted) so launch-time
  // recovery can offer to log it manually. This test asserts that quarantine and
  // fails against current main (which has no unrecoverable slot).
  it.each([
    ['unparseable', 'not-a-number'],
    ['object without segments', '{"lol":true}'],
    ['segments not an array', '{"segments":"x"}'],
    ['segment missing endedAt', '{"segments":[{"startedAt":1}],"runningSince":null}'],
  ])('quarantines a %s blob and returns null', async (_label, bad) => {
    await AsyncStorage.setItem(RUNNING_TIMER_KEY, bad);

    expect(await loadTimerState()).toBeNull();

    // Copied verbatim to the quarantine slot...
    expect(await AsyncStorage.getItem(UNRECOVERABLE_TIMER_KEY)).toBe(bad);
    // ...and only then removed from the running key (never destroyed before copy).
    expect(await AsyncStorage.getItem(RUNNING_TIMER_KEY)).toBeNull();
  });
});
