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
const ENERGY_ID = 'HKQuantityTypeIdentifierActiveEnergyBurned';

// Sums to 312 kcal.
const ENERGY_SAMPLES = [{ quantity: 200 }, { quantity: 112 }];

const STEP_SAMPLES = [
  { quantity: 2000, sourceRevision: { source: { name: 'Apple Watch' } } },
  { quantity: 2213 },
];
// Sums to 1.866 mi → rounds to 1.87.
const DISTANCE_SAMPLES = [{ quantity: 1.234 }, { quantity: 0.632 }];

const START = Date.parse('2026-07-20T10:00:00Z');
const END = START + 40 * 60 * 1000;

/** Route queryQuantitySamples by identifier to the given per-metric results. */
function routeQuery(steps: unknown[], distance: unknown[], energy: unknown[] = []) {
  HealthKit.queryQuantitySamples.mockImplementation((id: string) => {
    if (id === STEP_ID) return Promise.resolve(steps);
    if (id === DISTANCE_ID) return Promise.resolve(distance);
    if (id === ENERGY_ID) return Promise.resolve(energy);
    return Promise.resolve([]);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  HealthKit.isHealthDataAvailable.mockReturnValue(true);
  HealthKit.requestAuthorization.mockResolvedValue(true);
  routeQuery(STEP_SAMPLES, DISTANCE_SAMPLES);
  // Silence (and capture) the __DEV__ diagnostics.
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
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
    expect(arg.toRead).toEqual([STEP_ID, DISTANCE_ID, ENERGY_ID]);
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

  // Steps and distance flush to HealthKit independently, so a partial result is
  // flush lag, not truth. Require BOTH metrics before attaching; a zero in
  // either returns null so the retry schedule keeps going.
  it('returns null when distance is present but steps are zero (partial flush)', async () => {
    routeQuery([], DISTANCE_SAMPLES); // steps not flushed yet, distance has

    expect(await new HealthKitActivityService().getActivityForWindow(START, END)).toBeNull();
  });

  it('returns null when steps are present but distance is zero (partial flush)', async () => {
    routeQuery(STEP_SAMPLES, []); // steps flushed, distance not yet

    expect(await new HealthKitActivityService().getActivityForWindow(START, END)).toBeNull();
  });

  it('attaches only when both metrics are present', async () => {
    routeQuery(STEP_SAMPLES, DISTANCE_SAMPLES);

    const activity = await new HealthKitActivityService().getActivityForWindow(START, END);
    expect(activity).toEqual({
      steps: 4213,
      distanceMi: 1.87,
      source: 'Apple Watch',
      capturedAt: expect.any(String),
    });
  });

  // --- Opportunistic calories (a third metric; D-045 both-metrics rule unchanged) ---

  it('attaches active energy (calories) when present at capture time', async () => {
    routeQuery(STEP_SAMPLES, DISTANCE_SAMPLES, ENERGY_SAMPLES);

    const activity = await new HealthKitActivityService().getActivityForWindow(START, END);
    expect(activity?.activeEnergyKcal).toBe(312); // whole kcal
    // Calories is queried in kcal.
    const energyCall = HealthKit.queryQuantitySamples.mock.calls.find((c: unknown[]) => c[0] === ENERGY_ID);
    expect(energyCall[1].unit).toBe('kcal');
  });

  it('is a complete, successful capture with steps+distance and NO calories', async () => {
    routeQuery(STEP_SAMPLES, DISTANCE_SAMPLES, []); // energy not present

    const activity = await new HealthKitActivityService().getActivityForWindow(START, END);
    expect(activity).not.toBeNull();
    expect(activity?.steps).toBe(4213);
    expect(activity?.distanceMi).toBe(1.87);
    expect('activeEnergyKcal' in (activity as object)).toBe(false); // omitted, not zero
  });

  it('never fails the attach when the calories query throws (isolated + logged)', async () => {
    HealthKit.queryQuantitySamples.mockImplementation((id: string) => {
      if (id === STEP_ID) return Promise.resolve(STEP_SAMPLES);
      if (id === DISTANCE_ID) return Promise.resolve(DISTANCE_SAMPLES);
      if (id === ENERGY_ID) return Promise.reject(new Error('energy query failed'));
      return Promise.resolve([]);
    });

    const activity = await new HealthKitActivityService().getActivityForWindow(START, END);
    // Steps+distance still attach; calories omitted.
    expect(activity?.steps).toBe(4213);
    expect(activity?.activeEnergyKcal).toBeUndefined();
    // The failure is observable in dev (not swallowed silently).
    const logged = (console.warn as unknown as jest.Mock).mock.calls.map((c) => String(c[0])).join('\n');
    expect(logged).toContain('calories query threw');
  });

  it('does NOT attach a calories-only partial (no steps/distance) even with energy', async () => {
    routeQuery([], [], ENERGY_SAMPLES); // only calories present

    // The D-045 both-metrics gate holds: no steps+distance → null, no attach.
    expect(await new HealthKitActivityService().getActivityForWindow(START, END)).toBeNull();
  });

  it('logs a [activity] read line on the success path (steps/distanceMi/source)', async () => {
    const warnSpy = console.warn as unknown as jest.Mock;

    await new HealthKitActivityService().getActivityForWindow(START, END);

    const logged = warnSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(logged).toContain('[activity]');
    expect(logged).toContain('read:');
    expect(logged).toContain('steps=4213');
    expect(logged).toContain('distanceMi=1.87');
    expect(logged).toContain('source=Apple Watch');
  });

  // Regression pin for the query semantics verified against the native module:
  // the reported "no activity despite steps in the window" bug would be caused by
  // any of these three drifting, so pin them on the mock's received arguments.
  it('queries each metric over the window with no-limit, correct units, and Date bounds', async () => {
    await new HealthKitActivityService().getActivityForWindow(START, END);

    const stepCall = HealthKit.queryQuantitySamples.mock.calls.find(
      (c: unknown[]) => c[0] === STEP_ID,
    );
    const distCall = HealthKit.queryQuantitySamples.mock.calls.find(
      (c: unknown[]) => c[0] === DISTANCE_ID,
    );
    expect(stepCall).toBeDefined();
    expect(distCall).toBeDefined();

    // limit 0 == HKObjectQueryNoLimit (all samples) — NOT a positive cap.
    expect(stepCall[1].limit).toBe(0);
    expect(distCall[1].limit).toBe(0);
    // Exact unit strings for each quantity.
    expect(stepCall[1].unit).toBe('count');
    expect(distCall[1].unit).toBe('mi');
    // Window passed as Date objects (not epoch ms / ISO strings) equal to [START, END].
    const { startDate, endDate } = stepCall[1].filter.date;
    expect(startDate).toBeInstanceOf(Date);
    expect(endDate).toBeInstanceOf(Date);
    expect(startDate.getTime()).toBe(START);
    expect(endDate.getTime()).toBe(END);
  });

  it('logs a [activity] diagnostic naming the partial/empty path with per-metric counts', async () => {
    routeQuery(STEP_SAMPLES, []); // partial: steps present, distance not flushed
    const warnSpy = console.warn as unknown as jest.Mock;

    expect(await new HealthKitActivityService().getActivityForWindow(START, END)).toBeNull();

    const logged = warnSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(logged).toContain('[activity]');
    expect(logged).toContain('partial/empty window');
    expect(logged).toContain('distanceMi=0');
    expect(logged).toContain('(0 samples)');
  });

  it('logs a [activity] diagnostic with the error name/message when the query throws', async () => {
    HealthKit.queryQuantitySamples.mockRejectedValue(new TypeError('boom in native bridge'));
    const warnSpy = console.warn as unknown as jest.Mock;

    expect(await new HealthKitActivityService().getActivityForWindow(START, END)).toBeNull();

    const logged = warnSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(logged).toContain('[activity]');
    expect(logged).toContain('TypeError');
    expect(logged).toContain('boom in native bridge');
  });
});
