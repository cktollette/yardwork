import { HealthKitActivityService } from './HealthKitActivityService';

jest.mock('react-native-health', () => ({
  __esModule: true,
  default: {
    Constants: {
      Permissions: { Steps: 'Steps', DistanceWalkingRunning: 'DistanceWalkingRunning' },
      Units: { mile: 'mile' },
    },
    initHealthKit: jest.fn(),
    getDailyStepCountSamples: jest.fn(),
    getDailyDistanceWalkingRunningSamples: jest.fn(),
  },
  HealthUnit: { mile: 'mile' },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const AppleHealthKit = require('react-native-health').default;

const STEP_SAMPLES = [
  { value: 2000, startDate: '', endDate: '', sourceName: 'Apple Watch' },
  { value: 2213, startDate: '', endDate: '' },
];
// Sums to 1.866 mi → rounds to 1.87.
const DISTANCE_SAMPLES = [
  { value: 1.234, startDate: '', endDate: '' },
  { value: 0.632, startDate: '', endDate: '' },
];

const START = Date.parse('2026-07-20T10:00:00Z');
const END = START + 40 * 60 * 1000;

beforeEach(() => {
  jest.clearAllMocks();
  AppleHealthKit.initHealthKit.mockImplementation((_perms: unknown, cb: (e: unknown) => void) =>
    cb(null),
  );
  AppleHealthKit.getDailyStepCountSamples.mockImplementation(
    (_o: unknown, cb: (e: unknown, r: unknown) => void) => cb(null, STEP_SAMPLES),
  );
  AppleHealthKit.getDailyDistanceWalkingRunningSamples.mockImplementation(
    (_o: unknown, cb: (e: unknown, r: unknown) => void) => cb(null, DISTANCE_SAMPLES),
  );
});

describe('HealthKitActivityService', () => {
  it('maps steps/distance/source and rounds distance to 2 decimals', async () => {
    const activity = await new HealthKitActivityService().getActivityForWindow(START, END);

    expect(activity).toEqual({
      steps: 4213,
      distanceMi: 1.87,
      source: 'Apple Watch',
      capturedAt: expect.any(String),
    });
    // Distance is queried in miles.
    const distOpts = AppleHealthKit.getDailyDistanceWalkingRunningSamples.mock.calls[0][0];
    expect(distOpts.unit).toBe('mile');
  });

  it('requests read-only permissions (no writes)', async () => {
    await new HealthKitActivityService().getActivityForWindow(START, END);

    const perms = AppleHealthKit.initHealthKit.mock.calls[0][0];
    expect(perms.permissions.read).toEqual(['Steps', 'DistanceWalkingRunning']);
    expect(perms.permissions.write).toEqual([]);
  });

  it('returns null when permission/init is denied', async () => {
    AppleHealthKit.initHealthKit.mockImplementation((_p: unknown, cb: (e: unknown) => void) =>
      cb('not authorized'),
    );

    expect(await new HealthKitActivityService().getActivityForWindow(START, END)).toBeNull();
    expect(AppleHealthKit.getDailyStepCountSamples).not.toHaveBeenCalled();
  });

  it('returns null on a query error', async () => {
    AppleHealthKit.getDailyStepCountSamples.mockImplementation(
      (_o: unknown, cb: (e: unknown, r: unknown) => void) => cb('query failed', null),
    );

    expect(await new HealthKitActivityService().getActivityForWindow(START, END)).toBeNull();
  });

  it('returns null on an empty window (zero steps and zero distance)', async () => {
    AppleHealthKit.getDailyStepCountSamples.mockImplementation(
      (_o: unknown, cb: (e: unknown, r: unknown) => void) => cb(null, []),
    );
    AppleHealthKit.getDailyDistanceWalkingRunningSamples.mockImplementation(
      (_o: unknown, cb: (e: unknown, r: unknown) => void) => cb(null, []),
    );

    expect(await new HealthKitActivityService().getActivityForWindow(START, END)).toBeNull();
  });
});
