import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureActivityForMow } from './captureActivityForMow';
import { mowRepository } from '../mow/asyncStorageRepositories';
import type { Activity } from './ActivityService';

// Real repository (write queue + AsyncStorage) so we exercise the actual
// serialization guarantee; only the HealthKit service is mocked.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('./HealthKitActivityService', () => ({
  activityService: { getActivityForWindow: jest.fn() },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { activityService } = require('./HealthKitActivityService');

const ACTIVITY: Activity = {
  steps: 4213,
  distanceMi: 1.87,
  source: 'Apple Watch',
  capturedAt: '2026-08-10T15:00:00.000Z',
};

const START = Date.parse('2026-07-20T10:00:00Z');
const END = START + 40 * 60_000;

beforeEach(async () => {
  jest.useFakeTimers();
  await AsyncStorage.clear();
  activityService.getActivityForWindow.mockReset();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('captureActivityForMow — edit racing a retry (real repository)', () => {
  it('a user edit between attempt 1 (empty) and a successful attempt 2 survives with both fields', async () => {
    const saved = await mowRepository.saveMow({
      propertyId: 'p1',
      startedAt: START,
      endedAt: END,
      durationSeconds: 2400,
      notes: 'original',
    });
    activityService.getActivityForWindow
      .mockResolvedValueOnce(null) // attempt 1 empty → retry scheduled
      .mockResolvedValueOnce(ACTIVITY); // attempt 2 has data

    await captureActivityForMow({ id: saved.id, startedAt: START, endedAt: END });
    // Nothing attached yet — the +2 min retry is pending.
    expect((await mowRepository.getMowById(saved.id))?.activity).toBeUndefined();

    // Concurrently: the user edits notes while the retry fires attachActivity.
    const edit = mowRepository.update(saved.id, { notes: 'edited' });
    const retry = jest.advanceTimersByTimeAsync(2 * 60_000);
    await Promise.all([edit, retry]);

    // The write queue serialized both: the edit's notes and the retry's activity
    // both survive (capture-only provenance is preserved across the edit).
    const mow = await mowRepository.getMowById(saved.id);
    expect(mow?.notes).toBe('edited');
    expect(mow?.activity).toEqual(ACTIVITY);
  });
});
