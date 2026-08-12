import {
  migrateProperty,
  MIGRATED_ZONE_ID,
  MIGRATED_ZONE_NAME,
} from './migrateProperty';
import { computeAreaSqFt } from './area';
import type { Position } from '../mow/models';

const SQUARE: Position[] = [
  [0, 0],
  [0, 0.001],
  [0.001, 0.001],
  [0.001, 0],
];

const base = { id: 'p1', name: 'My Lawn', createdAt: 1_700_000_000_000 };

describe('migrateProperty', () => {
  it('maps a v7 single boundary to one "Lawn" zone with identical vertices and area', () => {
    const migrated = migrateProperty({ ...base, boundary: SQUARE, areaSqFt: 5000 });

    expect(migrated.zones).toHaveLength(1);
    const [zone] = migrated.zones;
    expect(zone.id).toBe(MIGRATED_ZONE_ID);
    expect(zone.name).toBe(MIGRATED_ZONE_NAME);
    expect(zone.vertices).toEqual(SQUARE); // identical, not re-derived
    expect(zone.areaSqFt).toBe(5000); // stored area reused, not recomputed
    expect('grassType' in zone).toBe(false); // migration never populates grass type
    // Legacy fields do not ride along.
    expect(migrated).not.toHaveProperty('boundary');
    expect(migrated).not.toHaveProperty('areaSqFt');
  });

  it('recomputes area only when the v7 record lacks a stored areaSqFt', () => {
    const migrated = migrateProperty({ ...base, boundary: SQUARE });

    expect(migrated.zones[0].areaSqFt).toBe(computeAreaSqFt(SQUARE));
  });

  it('maps a v7 record with no polygon to an empty zone list', () => {
    expect(migrateProperty({ ...base }).zones).toEqual([]);
    expect(migrateProperty({ ...base, boundary: null }).zones).toEqual([]);
  });

  it('treats a sub-3-vertex boundary as no polygon', () => {
    const migrated = migrateProperty({ ...base, boundary: [[0, 0], [0, 1]] });
    expect(migrated.zones).toEqual([]);
  });

  it('is idempotent — running on already-migrated data is a no-op', () => {
    const once = migrateProperty({ ...base, boundary: SQUARE, areaSqFt: 5000 });
    const twice = migrateProperty(once);
    expect(twice).toEqual(once);
  });

  it('returns an already-v8 property as-is, dropping any stray legacy fields', () => {
    const v8 = {
      ...base,
      zones: [{ id: 'z1', name: 'Back yard', vertices: SQUARE, areaSqFt: 1234 }],
      boundary: SQUARE, // stale leftover that must be dropped
      areaSqFt: 9999,
    };
    const migrated = migrateProperty(v8);
    expect(migrated.zones).toEqual(v8.zones);
    expect(migrated).not.toHaveProperty('boundary');
    expect(migrated).not.toHaveProperty('areaSqFt');
  });
});
