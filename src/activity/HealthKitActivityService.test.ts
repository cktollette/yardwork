import { HealthKitActivityService } from './HealthKitActivityService';

jest.mock('@kingstinct/react-native-healthkit', () => ({
  isHealthDataAvailable: jest.fn(),
  requestAuthorization: jest.fn(),
  queryStatisticsForQuantity: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const HealthKit = require('@kingstinct/react-native-healthkit');

const STEP_ID = 'HKQuantityTypeIdentifierStepCount';
const DISTANCE_ID = 'HKQuantityTypeIdentifierDistanceWalkingRunning';
const ENERGY_ID = 'HKQuantityTypeIdentifierActiveEnergyBurned';

/** A per-metric cumulative statistic. `sum: null` = no samples (empty window). */
type Metric = { sum: number | null; sources?: string[] };

const STEPS: Metric = { sum: 4213, sources: ['Apple Watch'] };
const DISTANCE: Metric = { sum: 1.866 }; // rounds to 1.87
const ENERGY: Metric = { sum: 312 };
const EMPTY: Metric = { sum: null };

const START = Date.parse('2026-07-20T10:00:00Z');
const END = START + 40 * 60 * 1000;

/** Shape a Metric like a HKStatisticsQuery cumulativeSum response. */
function statsResponse(m: Metric | undefined, unit: string) {
  if (!m) return { sources: [] };
  return {
    ...(m.sum != null ? { sumQuantity: { quantity: m.sum, unit } } : {}),
    sources: (m.sources ?? []).map((name) => ({ name })),
  };
}

/** Route queryStatisticsForQuantity by identifier to the given per-metric stats. */
function routeStats(steps?: Metric, distance?: Metric, energy?: Metric) {
  HealthKit.queryStatisticsForQuantity.mockImplementation((id: string) => {
    if (id === STEP_ID) return Promise.resolve(statsResponse(steps, 'count'));
    if (id === DISTANCE_ID) return Promise.resolve(statsResponse(distance, 'mi'));
    if (id === ENERGY_ID) return Promise.resolve(statsResponse(energy, 'kcal'));
    return Promise.resolve({ sources: [] });
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  HealthKit.isHealthDataAvailable.mockReturnValue(true);
  HealthKit.requestAuthorization.mockResolvedValue(true);
  routeStats(STEPS, DISTANCE);
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
  });

  // The reason for this whole change: overlapping sources must not double-count.
  it('reports the source-priority-deduplicated total, not a raw-sample sum', async () => {
    // Two sources contributed to the window (iPhone + Apple Watch). A raw-sample
    // sum would double-count the overlap; the cumulative statistic returns ONE
    // deduplicated total, which is exactly what we must report.
    routeStats(
      { sum: 5000, sources: ['iPhone', 'Apple Watch'] },
      { sum: 2.0, sources: ['iPhone', 'Apple Watch'] },
    );

    const activity = await new HealthKitActivityService().getActivityForWindow(START, END);

    expect(activity?.steps).toBe(5000); // the deduped statistic, NOT 10000
    expect(activity?.distanceMi).toBe(2);
    // And it asked HealthKit for the cumulative sum, per metric.
    for (const id of [STEP_ID, DISTANCE_ID]) {
      const call = HealthKit.queryStatisticsForQuantity.mock.calls.find(
        (c: unknown[]) => c[0] === id,
      );
      expect(call[1]).toEqual(['cumulativeSum']);
    }
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
    expect(HealthKit.queryStatisticsForQuantity).not.toHaveBeenCalled();
  });

  it('returns null when HealthKit data is unavailable', async () => {
    HealthKit.isHealthDataAvailable.mockReturnValue(false);

    expect(await new HealthKitActivityService().getActivityForWindow(START, END)).toBeNull();
    expect(HealthKit.requestAuthorization).not.toHaveBeenCalled();
  });

  it('returns null on a query error', async () => {
    HealthKit.queryStatisticsForQuantity.mockRejectedValue(new Error('query failed'));

    expect(await new HealthKitActivityService().getActivityForWindow(START, END)).toBeNull();
  });

  it('returns null on an empty window (zero steps and zero distance)', async () => {
    routeStats(EMPTY, EMPTY);

    expect(await new HealthKitActivityService().getActivityForWindow(START, END)).toBeNull();
  });

  // Steps and distance flush to HealthKit independently, so a partial result is
  // flush lag, not truth. Require BOTH metrics before attaching; a zero in
  // either returns null so the retry schedule keeps going.
  it('returns null when distance is present but steps are zero (partial flush)', async () => {
    routeStats(EMPTY, DISTANCE);

    expect(await new HealthKitActivityService().getActivityForWindow(START, END)).toBeNull();
  });

  it('returns null when steps are present but distance is zero (partial flush)', async () => {
    routeStats(STEPS, EMPTY);

    expect(await new HealthKitActivityService().getActivityForWindow(START, END)).toBeNull();
  });

  it('attaches only when both metrics are present', async () => {
    routeStats(STEPS, DISTANCE);

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
    routeStats(STEPS, DISTANCE, ENERGY);

    const activity = await new HealthKitActivityService().getActivityForWindow(START, END);
    expect(activity?.activeEnergyKcal).toBe(312); // whole kcal
    // Calories is queried in kcal, via cumulativeSum.
    const energyCall = HealthKit.queryStatisticsForQuantity.mock.calls.find(
      (c: unknown[]) => c[0] === ENERGY_ID,
    );
    expect(energyCall[1]).toEqual(['cumulativeSum']);
    expect(energyCall[2].unit).toBe('kcal');
  });

  it('is a complete, successful capture with steps+distance and NO calories', async () => {
    routeStats(STEPS, DISTANCE, EMPTY); // energy not present

    const activity = await new HealthKitActivityService().getActivityForWindow(START, END);
    expect(activity).not.toBeNull();
    expect(activity?.steps).toBe(4213);
    expect(activity?.distanceMi).toBe(1.87);
    expect('activeEnergyKcal' in (activity as object)).toBe(false); // omitted, not zero
  });

  it('never fails the attach when the calories query throws (isolated + logged)', async () => {
    HealthKit.queryStatisticsForQuantity.mockImplementation((id: string) => {
      if (id === STEP_ID) return Promise.resolve(statsResponse(STEPS, 'count'));
      if (id === DISTANCE_ID) return Promise.resolve(statsResponse(DISTANCE, 'mi'));
      if (id === ENERGY_ID) return Promise.reject(new Error('energy query failed'));
      return Promise.resolve({ sources: [] });
    });

    const activity = await new HealthKitActivityService().getActivityForWindow(START, END);
    // Steps+distance still attach; calories omitted.
    expect(activity?.steps).toBe(4213);
    expect(activity?.activeEnergyKcal).toBeUndefined();
    // The failure is observable in dev (not swallowed silently).
    const logged = (console.warn as unknown as jest.Mock).mock.calls.map((c) => String(c[0])).join('\n');
    expect(logged).toContain('calories statistics threw');
  });

  it('does NOT attach a calories-only partial (no steps/distance) even with energy', async () => {
    routeStats(EMPTY, EMPTY, ENERGY); // only calories present

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

  // Regression pin for the query semantics: the reported "no activity despite
  // steps in the window" bug would be caused by any of these drifting, so pin them
  // on the mock's received arguments — now a cumulativeSum statistic per metric.
  it('queries each metric as a cumulativeSum over the window with correct units and Date bounds', async () => {
    await new HealthKitActivityService().getActivityForWindow(START, END);

    const stepCall = HealthKit.queryStatisticsForQuantity.mock.calls.find(
      (c: unknown[]) => c[0] === STEP_ID,
    );
    const distCall = HealthKit.queryStatisticsForQuantity.mock.calls.find(
      (c: unknown[]) => c[0] === DISTANCE_ID,
    );
    expect(stepCall).toBeDefined();
    expect(distCall).toBeDefined();

    // The single statistic requested is the source-deduplicated cumulative sum.
    expect(stepCall[1]).toEqual(['cumulativeSum']);
    expect(distCall[1]).toEqual(['cumulativeSum']);
    // Exact unit strings for each quantity.
    expect(stepCall[2].unit).toBe('count');
    expect(distCall[2].unit).toBe('mi');
    // Window passed as Date objects (not epoch ms / ISO strings) equal to [START, END].
    const { startDate, endDate } = stepCall[2].filter.date;
    expect(startDate).toBeInstanceOf(Date);
    expect(endDate).toBeInstanceOf(Date);
    expect(startDate.getTime()).toBe(START);
    expect(endDate.getTime()).toBe(END);
  });

  it('logs a [activity] diagnostic naming the partial/empty path with per-metric source counts', async () => {
    routeStats(STEPS, EMPTY); // partial: steps present, distance not flushed
    const warnSpy = console.warn as unknown as jest.Mock;

    expect(await new HealthKitActivityService().getActivityForWindow(START, END)).toBeNull();

    const logged = warnSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(logged).toContain('[activity]');
    expect(logged).toContain('partial/empty window');
    expect(logged).toContain('distanceMi=0');
    expect(logged).toContain('(0 sources)');
  });

  it('logs a [activity] diagnostic with the error name/message when the query throws', async () => {
    HealthKit.queryStatisticsForQuantity.mockRejectedValue(new TypeError('boom in native bridge'));
    const warnSpy = console.warn as unknown as jest.Mock;

    expect(await new HealthKitActivityService().getActivityForWindow(START, END)).toBeNull();

    const logged = warnSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(logged).toContain('[activity]');
    expect(logged).toContain('TypeError');
    expect(logged).toContain('boom in native bridge');
  });
});
