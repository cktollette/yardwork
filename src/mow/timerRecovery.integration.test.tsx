import { createElement } from 'react';
import { Alert } from 'react-native';
import { act, create } from 'react-test-renderer';
import { pause, start } from './mowSegments';
import { mowRepository } from './asyncStorageRepositories';
import type { DraftMow } from './timer';
import {
  RUNNING_TIMER_KEY,
  UNRECOVERABLE_TIMER_KEY,
  loadTimerState,
} from './timerStorage';
import {
  RECOVERY_CONFIRM_LABEL,
  RECOVERY_DISMISS_LABEL,
  useUnfinishedMowRecovery,
} from './unfinishedMowRecovery';
import { formatMowDate } from './format';

/**
 * End-to-end smoke of PR 1's cross-build relaunch behavior, driven through the
 * REAL timerStorage AND the REAL mow repository against the in-memory
 * AsyncStorage (nothing in this file is mocked but the Alert). This is the
 * persistence + launch-recovery seam the app runs on mount; it stands in for a
 * physical simulator relaunch (a pure-JS change with no in-app affordance to
 * hand-seed a legacy/corrupt AsyncStorage blob).
 *
 *   Smoke 1 — start on a build with a legacy shape, relaunch on the fix build,
 *             expect the timer restored and NO false recovery prompt.
 *   Smoke 3 — a blob that survives a kill but fails validation is quarantined on
 *             THIS launch and offered for manual logging; recovery creates NO
 *             record on its own (only SaveMow's Save would), so Yes-then-back-out
 *             and Dismiss both leave the mow store untouched.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';

const T0 = 1_700_000_000_000;

function Harness({ open }: { open: (draft: DraftMow) => void }) {
  useUnfinishedMowRecovery(open);
  return null;
}

async function launch(open: (draft: DraftMow) => void = jest.fn()): Promise<void> {
  await act(async () => {
    create(createElement(Harness, { open }));
  });
  // Flush the hook's load -> quarantine -> slot-read -> alert chain.
  await act(async () => {});
  await act(async () => {});
}

function alertButtons(): { text: string; onPress?: () => void }[] {
  const spy = Alert.alert as unknown as jest.Mock;
  return spy.mock.calls[spy.mock.calls.length - 1][2];
}
async function press(label: string): Promise<void> {
  const button = alertButtons().find((b) => b.text === label)!;
  await act(async () => {
    button.onPress?.();
  });
}

const CORRUPT_SALVAGEABLE = JSON.stringify({
  // Structurally invalid (runningSince is a string) but a closed segment
  // survives — the realistic cross-build corruption the validator must reject
  // while still salvaging a start time + active duration.
  segments: [{ startedAt: T0, endedAt: T0 + 300_000 }],
  runningSince: 'oops',
});

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
  it('quarantines the blob (copy-first, running key cleared) and prompts with the salvaged start', async () => {
    await AsyncStorage.setItem(RUNNING_TIMER_KEY, CORRUPT_SALVAGEABLE);

    await launch();

    // Quarantined (copied first, running key then removed) — never destroyed.
    expect(await AsyncStorage.getItem(UNRECOVERABLE_TIMER_KEY)).toBe(CORRUPT_SALVAGEABLE);
    expect(await AsyncStorage.getItem(RUNNING_TIMER_KEY)).toBeNull();

    // Prompted with the pinned copy at the salvaged start (T0, from the segment).
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    const title = (Alert.alert as unknown as jest.Mock).mock.calls[0][0] as string;
    expect(title).toBe(
      `We found an unfinished mow from ${formatMowDate(T0)} we could not restore. Log it manually?`,
    );
  });

  it('Yes hands the salvaged draft to SaveMow and, if the user backs out, writes NOTHING to the store', async () => {
    await AsyncStorage.setItem(RUNNING_TIMER_KEY, CORRUPT_SALVAGEABLE);

    let handed: DraftMow | undefined;
    await launch((draft) => {
      handed = draft; // stand in for navigation to SaveMow; the user then backs out (never Saves)
    });
    await press(RECOVERY_CONFIRM_LABEL);
    await act(async () => {});

    // The draft is synthesized from the salvaged segment: start T0, 300s active.
    expect(handed).toEqual({ startedAt: T0, endedAt: T0 + 300_000, durationSeconds: 300 });
    // Quarantine slot retired, and the mow store is UNCHANGED — no placeholder record.
    expect(await AsyncStorage.getItem(UNRECOVERABLE_TIMER_KEY)).toBeNull();
    expect(await mowRepository.listMows()).toEqual([]);
  });

  it('Dismiss clears the quarantine slot, routes nowhere, and writes NOTHING to the store', async () => {
    await AsyncStorage.setItem(RUNNING_TIMER_KEY, CORRUPT_SALVAGEABLE);

    const open = jest.fn();
    await launch(open);
    await press(RECOVERY_DISMISS_LABEL);
    await act(async () => {});

    expect(open).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(UNRECOVERABLE_TIMER_KEY)).toBeNull();
    expect(await mowRepository.listMows()).toEqual([]);
  });
});
