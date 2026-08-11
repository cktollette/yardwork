import { captureActivityForMow, MIN_WINDOW_MS, RETRY_OFFSETS_MS } from './captureActivityForMow';
import type { Activity } from './ActivityService';

jest.mock('./HealthKitActivityService', () => ({
  activityService: { getActivityForWindow: jest.fn() },
}));
jest.mock('../mow/asyncStorageRepositories', () => ({
  mowRepository: { attachActivity: jest.fn() },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { activityService } = require('./HealthKitActivityService');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { mowRepository } = require('../mow/asyncStorageRepositories');

const ACTIVITY: Activity = {
  steps: 4213,
  distanceMi: 1.87,
  source: 'Apple Watch',
  capturedAt: '2026-08-10T15:00:00.000Z',
};

const START = Date.parse('2026-07-20T10:00:00Z');
const END = START + 40 * 60_000;
const [RETRY_1_MS, RETRY_2_MS] = RETRY_OFFSETS_MS; // +2 min, +5 min from save

beforeEach(() => {
  jest.useFakeTimers();
  activityService.getActivityForWindow.mockReset().mockResolvedValue(ACTIVITY);
  mowRepository.attachActivity.mockReset().mockResolvedValue(undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('captureActivityForMow — window guard', () => {
  it('refuses (silent) when startedAt is missing', async () => {
    await captureActivityForMow({ id: 'm1', endedAt: START + MIN_WINDOW_MS });

    expect(activityService.getActivityForWindow).not.toHaveBeenCalled();
    expect(mowRepository.attachActivity).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('refuses (silent) when endedAt is missing', async () => {
    await captureActivityForMow({ id: 'm1', startedAt: START });

    expect(activityService.getActivityForWindow).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('refuses (silent) for a sub-60s window', async () => {
    await captureActivityForMow({ id: 'm1', startedAt: START, endedAt: START + 59_000 });

    expect(activityService.getActivityForWindow).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('captures at exactly the 60s floor', async () => {
    await captureActivityForMow({ id: 'm1', startedAt: START, endedAt: START + MIN_WINDOW_MS });

    expect(activityService.getActivityForWindow).toHaveBeenCalledWith(START, START + MIN_WINDOW_MS);
    expect(mowRepository.attachActivity).toHaveBeenCalledWith('m1', ACTIVITY);
  });
});

describe('captureActivityForMow — bounded retry on delayed pedometer flush', () => {
  it('attaches on the first attempt and schedules no retry when data is present', async () => {
    await captureActivityForMow({ id: 'm1', startedAt: START, endedAt: END });

    expect(activityService.getActivityForWindow).toHaveBeenCalledTimes(1);
    expect(mowRepository.attachActivity).toHaveBeenCalledWith('m1', ACTIVITY);
    expect(jest.getTimerCount()).toBe(0); // no retry scheduled
  });

  it('retries at +2 min when the first attempt is empty, then attaches', async () => {
    activityService.getActivityForWindow
      .mockReset()
      .mockResolvedValueOnce(null) // attempt 1: pedometer not flushed yet
      .mockResolvedValueOnce(ACTIVITY); // attempt 2: data has landed

    await captureActivityForMow({ id: 'm1', startedAt: START, endedAt: END });

    // First attempt empty → nothing attached, one retry pending.
    expect(activityService.getActivityForWindow).toHaveBeenCalledTimes(1);
    expect(mowRepository.attachActivity).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(1);

    // Just before +2 min: still nothing.
    await jest.advanceTimersByTimeAsync(RETRY_1_MS - 1000);
    expect(activityService.getActivityForWindow).toHaveBeenCalledTimes(1);

    // At +2 min: attempt 2 fires and attaches; schedule stops.
    await jest.advanceTimersByTimeAsync(1000);
    expect(activityService.getActivityForWindow).toHaveBeenCalledTimes(2);
    expect(mowRepository.attachActivity).toHaveBeenCalledWith('m1', ACTIVITY);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('fires the third attempt at +5 min from save when the first two are empty', async () => {
    activityService.getActivityForWindow
      .mockReset()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(ACTIVITY);

    await captureActivityForMow({ id: 'm1', startedAt: START, endedAt: END });
    await jest.advanceTimersByTimeAsync(RETRY_1_MS); // +2 min → attempt 2 (empty)
    expect(activityService.getActivityForWindow).toHaveBeenCalledTimes(2);
    expect(mowRepository.attachActivity).not.toHaveBeenCalled();

    // Remaining delta to +5 min → attempt 3 (data).
    await jest.advanceTimersByTimeAsync(RETRY_2_MS - RETRY_1_MS);
    expect(activityService.getActivityForWindow).toHaveBeenCalledTimes(3);
    expect(mowRepository.attachActivity).toHaveBeenCalledWith('m1', ACTIVITY);
  });

  it('gives up silently after all three attempts return empty', async () => {
    activityService.getActivityForWindow.mockReset().mockResolvedValue(null);

    await captureActivityForMow({ id: 'm1', startedAt: START, endedAt: END });
    expect(activityService.getActivityForWindow).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(RETRY_1_MS); // attempt 2
    await jest.advanceTimersByTimeAsync(RETRY_2_MS - RETRY_1_MS); // attempt 3

    expect(activityService.getActivityForWindow).toHaveBeenCalledTimes(3);
    expect(mowRepository.attachActivity).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0); // schedule exhausted
  });

  it('never rejects, even when every attempt throws', async () => {
    activityService.getActivityForWindow.mockReset().mockRejectedValue(new Error('boom'));
    mowRepository.attachActivity.mockRejectedValue(new Error('boom'));

    await expect(
      captureActivityForMow({ id: 'm1', startedAt: START, endedAt: END }),
    ).resolves.toBeUndefined();

    // Run the whole schedule out; still no unhandled rejection.
    await jest.advanceTimersByTimeAsync(RETRY_2_MS);
    expect(activityService.getActivityForWindow).toHaveBeenCalledTimes(3);
    expect(mowRepository.attachActivity).not.toHaveBeenCalled();
  });
});
