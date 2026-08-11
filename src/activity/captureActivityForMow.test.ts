import { captureActivityForMow, MIN_WINDOW_MS } from './captureActivityForMow';
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

beforeEach(() => {
  jest.clearAllMocks();
  activityService.getActivityForWindow.mockResolvedValue(ACTIVITY);
  mowRepository.attachActivity.mockResolvedValue(undefined);
});

describe('captureActivityForMow', () => {
  it('refuses (silent) when startedAt is missing', async () => {
    await captureActivityForMow({ id: 'm1', endedAt: START + MIN_WINDOW_MS });

    expect(activityService.getActivityForWindow).not.toHaveBeenCalled();
    expect(mowRepository.attachActivity).not.toHaveBeenCalled();
  });

  it('refuses (silent) when endedAt is missing', async () => {
    await captureActivityForMow({ id: 'm1', startedAt: START });

    expect(activityService.getActivityForWindow).not.toHaveBeenCalled();
    expect(mowRepository.attachActivity).not.toHaveBeenCalled();
  });

  it('refuses (silent) for a sub-60s window', async () => {
    await captureActivityForMow({ id: 'm1', startedAt: START, endedAt: START + 59_000 });

    expect(activityService.getActivityForWindow).not.toHaveBeenCalled();
  });

  it('captures at exactly the 60s floor', async () => {
    await captureActivityForMow({ id: 'm1', startedAt: START, endedAt: START + MIN_WINDOW_MS });

    expect(activityService.getActivityForWindow).toHaveBeenCalledWith(START, START + MIN_WINDOW_MS);
    expect(mowRepository.attachActivity).toHaveBeenCalledWith('m1', ACTIVITY);
  });

  it('skips silently when the service returns null', async () => {
    activityService.getActivityForWindow.mockResolvedValue(null);

    await captureActivityForMow({ id: 'm1', startedAt: START, endedAt: START + 40 * 60_000 });

    expect(mowRepository.attachActivity).not.toHaveBeenCalled();
  });

  it('never rejects, even when every dependency throws', async () => {
    activityService.getActivityForWindow.mockRejectedValue(new Error('boom'));
    mowRepository.attachActivity.mockRejectedValue(new Error('boom'));

    await expect(
      captureActivityForMow({ id: 'm1', startedAt: START, endedAt: START + 40 * 60_000 }),
    ).resolves.toBeUndefined();
  });
});
