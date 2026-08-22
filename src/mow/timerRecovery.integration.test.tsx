import { createElement } from 'react';
import { Alert } from 'react-native';
import { act, create } from 'react-test-renderer';
import { pause, start } from './mowSegments';
import {
  RUNNING_TIMER_KEY,
  UNRECOVERABLE_TIMER_KEY,
  loadTimerState,
} from './timerStorage';
import { useUnfinishedMowRecovery } from './unfinishedMowRecovery';
import { formatMowDate } from './format';

/**
 * End-to-end smoke of PR 1's cross-build relaunch behavior, driven through the
 * REAL timerStorage against the in-memory AsyncStorage (no timerStorage mock).
 * This is the persistence + launch-recovery seam the app actually runs on mount;
 * it stands in for a physical simulator relaunch (a pure-JS change with no in-app
 * affordance to hand-seed a legacy/corrupt AsyncStorage blob).
 *
 *   Smoke 1 — start on a build with a legacy shape, relaunch on the fix build,
 *             expect the timer restored and NO false recovery prompt.
 *   Smoke 3 — a blob that survives a kill but fails validation is quarantined on
 *             THIS launch and offered for manual logging.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
// Real timerStorage; only the repository (default property + saveMow) is stubbed
// so the flow touches no other domain.
jest.mock('./asyncStorageRepositories', () => ({
  mowRepository: { saveMow: jest.fn(() => Promise.resolve({ id: 'mow-recovered' })) },
  propertyRepository: { getOrCreateDefault: jest.fn(() => Promise.resolve({ id: 'prop-1' })) },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

const T0 = 1_700_000_000_000;

function Harness({ open }: { open: (mowId: string) => void }) {
  useUnfinishedMowRecovery(open);
  return null;
}

async function launch(open: (mowId: string) => void = jest.fn()): Promise<void> {
  await act(async () => {
    create(createElement(Harness, { open }));
  });
  // Flush the hook's load -> quarantine -> slot-read -> alert chain.
  await act(async () => {});
  await act(async () => {});
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

describe('smoke 1: cross-build legacy restore, no false prompt', () => {
  it('v1 bare-number blob restores as running and does not prompt', async () => {
    await AsyncStorage.setItem(RUNNING_TIMER_KEY, String(T0)); // pre-pause build wrote this

    // The Timer screen's mount loader restores it...
    expect(await loadTimerState()).toEqual({ segments: [], runningSince: T0 });

    // ...and launch recovery does NOT prompt for a perfectly restorable blob.
    await launch();
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(UNRECOVERABLE_TIMER_KEY)).toBeNull();
  });

  it('unversioned v2 paused blob restores frozen and does not prompt', async () => {
    const paused = pause(start(T0), T0 + 300_000);
    await AsyncStorage.setItem(RUNNING_TIMER_KEY, JSON.stringify(paused)); // #50 build shape

    expect(await loadTimerState()).toEqual(paused);

    await launch();
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});

describe('smoke 3: corrupt-but-salvageable blob is quarantined on launch and prompted', () => {
  it('quarantines the blob, clears the running key, and offers manual logging', async () => {
    // Structurally invalid (runningSince is a string) but a closed segment
    // survives — the realistic cross-build corruption the validator must reject
    // while still salvaging a start time.
    const corrupt = JSON.stringify({
      segments: [{ startedAt: T0, endedAt: T0 + 300_000 }],
      runningSince: 'oops',
    });
    await AsyncStorage.setItem(RUNNING_TIMER_KEY, corrupt);

    await launch();

    // Quarantined (copied first, running key then removed) — never destroyed.
    expect(await AsyncStorage.getItem(UNRECOVERABLE_TIMER_KEY)).toBe(corrupt);
    expect(await AsyncStorage.getItem(RUNNING_TIMER_KEY)).toBeNull();

    // Prompted with the pinned copy at the salvaged start (T0, from the segment).
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    const title = (Alert.alert as unknown as jest.Mock).mock.calls[0][0] as string;
    expect(title).toBe(
      `We found an unfinished mow from ${formatMowDate(T0)} we could not restore. Log it manually?`,
    );
  });
});
