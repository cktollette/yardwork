import { createElement } from 'react';
import { Alert } from 'react-native';
import { act, create } from 'react-test-renderer';
import { formatMowDate } from './format';
import {
  RECOVERY_CONFIRM_LABEL,
  RECOVERY_DISMISS_LABEL,
  unfinishedMowPromptTitle,
  useUnfinishedMowRecovery,
} from './unfinishedMowRecovery';

jest.mock('./asyncStorageRepositories', () => ({
  mowRepository: { saveMow: jest.fn() },
  propertyRepository: { getOrCreateDefault: jest.fn() },
}));
jest.mock('./timerStorage', () => ({
  loadTimerState: jest.fn(),
  loadUnrecoverableRaw: jest.fn(),
  clearUnrecoverable: jest.fn(),
  salvageDraft: jest.fn(),
}));

import { mowRepository, propertyRepository } from './asyncStorageRepositories';
import {
  clearUnrecoverable,
  loadTimerState,
  loadUnrecoverableRaw,
  salvageDraft,
} from './timerStorage';

const saveMow = mowRepository.saveMow as jest.Mock;
const getProperty = propertyRepository.getOrCreateDefault as jest.Mock;
const loadState = loadTimerState as jest.Mock;
const loadRaw = loadUnrecoverableRaw as jest.Mock;
const clearRaw = clearUnrecoverable as jest.Mock;
const salvage = salvageDraft as jest.Mock;

const T0 = 1_700_000_000_000;
const DRAFT = { startedAt: T0, endedAt: T0, durationSeconds: 0 };

/** Headless host that just runs the hook, so we can mount it with the renderer. */
function Harness({ open }: { open: (mowId: string) => void }) {
  useUnfinishedMowRecovery(open);
  return null;
}

async function mountHook(open: (mowId: string) => void = jest.fn()): Promise<void> {
  await act(async () => {
    create(createElement(Harness, { open }));
  });
}

/** Grab the buttons handed to the last Alert.alert call. */
function alertButtons(): { text: string; onPress?: () => void }[] {
  const spy = Alert.alert as unknown as jest.Mock;
  return spy.mock.calls[spy.mock.calls.length - 1][2];
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  getProperty.mockResolvedValue({ id: 'prop-1' });
  saveMow.mockResolvedValue({ id: 'mow-9' });
  clearRaw.mockResolvedValue(undefined);
  // The hook forces a load first (that's what quarantines a corrupt blob); its
  // result is irrelevant to these unit cases, which drive the slot directly.
  loadState.mockResolvedValue(null);
});

it('does not prompt when there is no quarantined blob', async () => {
  loadRaw.mockResolvedValue(null);
  await mountHook();
  expect(Alert.alert).not.toHaveBeenCalled();
});

it('does not prompt when the blob has no salvageable start time', async () => {
  loadRaw.mockResolvedValue('garbage');
  salvage.mockReturnValue(null);
  await mountHook();
  expect(Alert.alert).not.toHaveBeenCalled();
  // Left in place for inspection — not cleared.
  expect(clearRaw).not.toHaveBeenCalled();
});

it('prompts with the exact ASCII copy and salvaged date', async () => {
  loadRaw.mockResolvedValue('{"segments":"x"}');
  salvage.mockReturnValue(DRAFT);
  await mountHook();

  const title = (Alert.alert as unknown as jest.Mock).mock.calls[0][0] as string;
  // Copy is pinned: exact wording, no em dash / non-ASCII.
  expect(title).toBe(
    `We found an unfinished mow from ${formatMowDate(T0)} we could not restore. Log it manually?`,
  );
  expect(title).toBe(unfinishedMowPromptTitle(T0));
  expect(/[^\x00-\x7F]/.test(title)).toBe(false);
  const labels = alertButtons().map((b) => b.text);
  expect(labels).toEqual([RECOVERY_DISMISS_LABEL, RECOVERY_CONFIRM_LABEL]);
});

it('Yes creates a placeholder mow at the salvaged start, clears the slot, and opens the editor', async () => {
  loadRaw.mockResolvedValue('{"segments":"x"}');
  salvage.mockReturnValue(DRAFT);
  const open = jest.fn();
  await mountHook(open);

  const yes = alertButtons().find((b) => b.text === RECOVERY_CONFIRM_LABEL)!;
  await act(async () => {
    yes.onPress?.();
  });

  expect(saveMow).toHaveBeenCalledWith({
    propertyId: 'prop-1',
    startedAt: T0,
    endedAt: T0,
    durationSeconds: 0,
  });
  expect(clearRaw).toHaveBeenCalled();
  expect(open).toHaveBeenCalledWith('mow-9');
});

it('Dismiss clears the slot and creates nothing', async () => {
  loadRaw.mockResolvedValue('{"segments":"x"}');
  salvage.mockReturnValue(DRAFT);
  const open = jest.fn();
  await mountHook(open);

  const dismiss = alertButtons().find((b) => b.text === RECOVERY_DISMISS_LABEL)!;
  await act(async () => {
    dismiss.onPress?.();
  });

  expect(clearRaw).toHaveBeenCalled();
  expect(saveMow).not.toHaveBeenCalled();
  expect(open).not.toHaveBeenCalled();
});
