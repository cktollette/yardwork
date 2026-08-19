import {
  bestSqFtPerMinute,
  buildShareCardModel,
  perMowSqFtPerMinute,
} from './shareCardModel';
import type { Mow, Zone } from '../mow/models';

const ZONES = [
  { id: 'z1', areaSqFt: 3000 },
  { id: 'z2', areaSqFt: 2000 },
] as Zone[]; // 5000 sq ft total

function mow(over: Partial<Mow> = {}): Mow {
  return {
    id: 'm1',
    startedAt: Date.parse('2026-07-22T10:00:00Z'),
    endedAt: Date.parse('2026-07-22T10:30:00Z'),
    durationSeconds: 1800, // 30 min -> 5000/30 = 166.7 sq ft/min
    zoneIds: ['z1', 'z2'],
    ...over,
  } as Mow;
}

describe('perMowSqFtPerMinute / bestSqFtPerMinute', () => {
  it('computes area covered per minute, null when area or time is zero', () => {
    expect(perMowSqFtPerMinute(mow(), ZONES)).toBeCloseTo(5000 / 30, 6);
    expect(perMowSqFtPerMinute(mow({ zoneIds: [] }), ZONES)).toBeNull(); // no covered area
    expect(perMowSqFtPerMinute(mow({ durationSeconds: 0 }), ZONES)).toBeNull();
  });

  it('takes the best rate, and includes whichever mows are passed', () => {
    const slow = mow({ id: 'slow', durationSeconds: 3600 }); // 5000/60 = 83.3
    const fast = mow({ id: 'fast', durationSeconds: 900 }); // 5000/15 = 333.3
    expect(bestSqFtPerMinute([slow, fast], ZONES)).toBeCloseTo(5000 / 15, 6);
    expect(bestSqFtPerMinute([], ZONES)).toBeNull();
  });
});

describe('buildShareCardModel', () => {
  const withWeatherTools = mow({
    toolTypes: ['mower', 'trimmer'],
    weather: { tempF: 72, condition: 'Clear', humidity: 40, capturedAt: 'x' },
  });

  it('builds all fields; area is a full ring, efficiency a progress ring', () => {
    const faster = mow({ id: 'fast', durationSeconds: 900 }); // best, 2x this mow's rate
    const model = buildShareCardModel(withWeatherTools, ZONES, [withWeatherTools, faster]);

    expect(model.dateLabel).toBe('Jul 22, 2026');
    expect(model.durationLabel).toBe('00:30:00');
    expect(model.tempLabel).toBe('72F');
    expect(model.toolsLabel).toBe('Mower, Trimmer');
    expect(model.areaRing).toEqual({ value: '5.0k', label: 'sq ft' });
    expect(model.areaRing?.progress).toBeUndefined(); // full ring
    expect(model.efficiencyRing?.label).toBe('sq ft/min');
    expect(model.efficiencyRing?.value).toBe('167');
    expect(model.efficiencyRing?.progress).toBeCloseTo(0.5, 6); // this mow is half the best
  });

  it('this-mow-is-best: efficiency renders a full ring (progress 1)', () => {
    const slower = mow({ id: 'slow', durationSeconds: 3600 }); // half this mow's rate
    // Pass the list that INCLUDES this mow; this mow is the fastest.
    const model = buildShareCardModel(withWeatherTools, ZONES, [withWeatherTools, slower]);
    expect(model.efficiencyRing?.progress).toBe(1);
  });

  it('omits tools when none were recorded', () => {
    expect(buildShareCardModel(mow({ toolTypes: undefined }), ZONES, [mow()]).toolsLabel).toBeNull();
    expect(buildShareCardModel(mow({ toolTypes: [] }), ZONES, [mow()]).toolsLabel).toBeNull();
  });

  it('omits temperature when there is no weather', () => {
    expect(buildShareCardModel(mow({ weather: undefined }), ZONES, [mow()]).tempLabel).toBeNull();
  });

  it('omits BOTH rings when there is no lawn area', () => {
    const model = buildShareCardModel(withWeatherTools, [], [withWeatherTools]);
    expect(model.areaRing).toBeNull();
    expect(model.efficiencyRing).toBeNull();
    // The rest of the card still builds.
    expect(model.dateLabel).toBe('Jul 22, 2026');
    expect(model.durationLabel).toBe('00:30:00');
  });

  it('minimum mow (no tools, no weather, no area): only date and duration', () => {
    const bare = mow({ toolTypes: undefined, weather: undefined });
    const model = buildShareCardModel(bare, [], [bare]);
    expect(model).toEqual({
      dateLabel: 'Jul 22, 2026',
      durationLabel: '00:30:00',
      tempLabel: null,
      toolsLabel: null,
      areaRing: null,
      efficiencyRing: null,
    });
  });
});
