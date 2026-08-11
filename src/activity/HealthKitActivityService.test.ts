import { HealthKitActivityService } from './HealthKitActivityService';

jest.mock('@kingstinct/react-native-healthkit', () => ({
  isHealthDataAvailable: jest.fn(),
  requestAuthorization: jest.fn(),
  queryQuantitySamples: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const HealthKit = require('@kingstinct/react-native-healthkit');

const STEP_ID = 'HKQuantityTypeIdentifierStepCount';
const DISTANCE_ID = 'HKQuantityTypeIdentifierDistanceWalkingRunning';

const STEP_SAMPLES = [
  { quantity: 2000, sourceRevision: { source: { name: 'Apple Watch' } } },
  { quantity: 2213 },
];
// Sums to 1.866 mi → rounds to 1.87.
const DISTANCE_SAMPLES = [{ quantity: 1.234 }, { quantity: 0.632 }];

const START = Date.parse('2026-07-20T10:00:00Z');
const END = START + 40 * 60 * 1000;

/** Route queryQuantitySamples by identifier to the given per-metric results. */
function routeQuery(steps: unknown[], distance: unknown[]) {
  HealthKit.queryQuantitySamples.mockImplementation((id: string) => {
    if (id === STEP_ID) return Promise.resolve(steps);
    if (id === DISTANCE_ID) return Promise.resolve(distance);
    return Promise.resolve([]);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  HealthKit.isHealthDataAvailable.mockReturnValue(true);
  HealthKit.requestAuthorization.mockResolvedValue(true);
  routeQuery(STEP_SAMPLES, DISTANCE_SAMPLES);
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
    const distCall = HealthKit.queryQuantitySamples.mock.calls.find(
      (c: unknown[]) => c[0] === DISTANCE_ID,
    );
    expect(distCall[1].unit).toBe('mi');
  });

  it('requests read-only authorization (no writes)', async () => {
    await new HealthKitActivityService().getActivityForWindow(START, END);

    const arg = HealthKit.requestAuthorization.mock.calls[0][0];
    expect(arg.toRead).toEqual([STEP_ID, DISTANCE_ID]);
    expect(arg.toShare).toBeUndefined();
  });

  it('returns null when authorization is denied', async () => {
    HealthKit.requestAuthorization.mockRejectedValue(new Error('not authorized'));

    expect(await new HealthKitActivityService().getActivityForWindow(START, END)).toBeNull();
    expect(HealthKit.queryQuantitySamples).not.toHaveBeenCalled();
  });

  it('returns null when HealthKit data is unavailable', async () => {
    HealthKit.isHealthDataAvailable.mockReturnValue(false);

    expect(await new HealthKitActivityService().getActivityForWindow(START, END)).toBeNull();
    expect(HealthKit.requestAuthorization).not.toHaveBeenCalled();
  });

  it('returns null on a query error', async () => {
    HealthKit.queryQuantitySamples.mockRejectedValue(new Error('query failed'));

    expect(await new HealthKitActivityService().getActivityForWindow(START, END)).toBeNull();
  });

  it('returns null on an empty window (zero steps and zero distance)', async () => {
    routeQuery([], []);

    expect(await new HealthKitActivityService().getActivityForWindow(START, END)).toBeNull();
  });
});
