import { coveredAreaSqFt, defaultZoneName, totalAreaSqFt } from './zones';
import { computeAreaSqFt } from './area';
import { deriveStats } from '../stats/deriveStats';
import type { Position, Zone } from '../mow/models';

function zone(areaSqFt: number, over: Partial<Zone> = {}): Zone {
  return { id: 'z', name: 'Lawn', vertices: [], areaSqFt, ...over };
}

const NOW = Date.parse('2026-07-22T12:00:00Z');
const mow = { startedAt: NOW - 1800_000, endedAt: NOW, durationSeconds: 1800 }; // 30 min

describe('defaultZoneName', () => {
  it('names the first zone "Lawn" and the rest "Zone N"', () => {
    expect(defaultZoneName(0)).toBe('Lawn');
    expect(defaultZoneName(1)).toBe('Zone 2');
    expect(defaultZoneName(2)).toBe('Zone 3');
  });
});

describe('totalAreaSqFt', () => {
  it('sums the areas across multiple zones', () => {
    expect(totalAreaSqFt([zone(1000), zone(2500), zone(500)])).toBe(4000);
  });

  it('is 0 for an empty lawn', () => {
    expect(totalAreaSqFt([])).toBe(0);
  });
});

describe('coveredAreaSqFt (per-mow zone coverage)', () => {
  const zones = [zone(1000, { id: 'z1' }), zone(2000, { id: 'z2' }), zone(500, { id: 'z3' })];

  it('absent zoneIds means the whole lawn (sum of all zones)', () => {
    expect(coveredAreaSqFt(undefined, zones)).toBe(3500);
    expect(coveredAreaSqFt(undefined, zones)).toBe(totalAreaSqFt(zones));
  });

  it('a subset sums only the selected zones (less than the whole lawn)', () => {
    expect(coveredAreaSqFt(['z1'], zones)).toBe(1000);
    expect(coveredAreaSqFt(['z1', 'z3'], zones)).toBe(1500);
  });

  it('tolerates a referenced zone that was later deleted (drops it, no throw)', () => {
    expect(coveredAreaSqFt(['z1', 'gone'], zones)).toBe(1000);
    expect(coveredAreaSqFt(['gone'], zones)).toBe(0); // all referenced deleted
  });

  it('is 0 for an empty selection or an empty lawn', () => {
    expect(coveredAreaSqFt([], zones)).toBe(0);
    expect(coveredAreaSqFt(['z1'], [])).toBe(0);
  });
});

describe('single-zone regression pin', () => {
  // A real boundary and its pre-migration area — the exact number an existing
  // user had before multi-zone. One zone carrying that area must reproduce it
  // byte-for-byte and drive identical stats.
  const BOUNDARY: Position[] = [
    [-96.8236, 33.1507],
    [-96.8232, 33.1507],
    [-96.8232, 33.1504],
    [-96.8236, 33.1504],
  ];
  const preMigrationArea = computeAreaSqFt(BOUNDARY);
  const zones: Zone[] = [
    { id: 'lawn', name: 'Lawn', vertices: BOUNDARY, areaSqFt: preMigrationArea },
  ];

  it('one zone reproduces the pre-migration total area exactly', () => {
    expect(totalAreaSqFt(zones)).toBe(preMigrationArea);
  });

  it('one zone drives identical area & efficiency stats to the old single polygon', () => {
    const viaZones = deriveStats([mow], { areaSqFt: totalAreaSqFt(zones), now: NOW });
    const viaBoundary = deriveStats([mow], { areaSqFt: preMigrationArea, now: NOW });
    expect(viaZones).toEqual(viaBoundary);
    expect(viaZones.lifetimeAreaSqFt).toBe(preMigrationArea);
    expect(viaZones.sqFtPerMinute).toBeCloseTo(preMigrationArea / 30, 10);
  });
});

describe('stats gate via zone sum', () => {
  it('zero zones closes the area gate (stats null)', () => {
    const s = deriveStats([mow], { areaSqFt: totalAreaSqFt([]), now: NOW });
    expect(s.lifetimeAreaSqFt).toBeNull();
    expect(s.sqFtPerMinute).toBeNull();
  });

  it('one zone reopens the gate (area stats compute)', () => {
    const s = deriveStats([mow], { areaSqFt: totalAreaSqFt([zone(6000)]), now: NOW });
    expect(s.lifetimeAreaSqFt).toBe(6000);
    expect(s.sqFtPerMinute).toBeCloseTo(200, 10);
  });
});
