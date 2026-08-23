import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MOWS_KEY,
  PROPERTIES_KEY,
  mowRepository,
  propertyRepository,
} from '../mow/asyncStorageRepositories';
import { EQUIPMENT_KEY, equipmentRepository } from '../equipment/asyncStorageRepositories';
import { SCHEMA_VERSION, SCHEMA_VERSION_KEY } from './schema';
import { deriveStats } from '../stats/deriveStats';
import { totalAreaSqFt } from '../lawn/zones';
import type { Position } from '../mow/models';

// In-memory AsyncStorage mock shipped with the async-storage package.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

beforeEach(async () => {
  await AsyncStorage.clear();
});

const SQUARE: Position[] = [
  [-96.8236, 33.1507],
  [-96.8232, 33.1507],
  [-96.8232, 33.1504],
  [-96.8236, 33.1504],
];
const CREATED = 1_700_000_000_000;

/**
 * Realistic mows with the fields added across v3–v13
 * (hoc/tools/weather/activity/clippingBags/photos/zoneIds).
 */
const MOWS = [
  {
    id: 'mow-1',
    propertyId: 'prop-1',
    startedAt: CREATED,
    endedAt: CREATED + 1800 * 1000,
    durationSeconds: 1800,
    hocInches: 2.5,
    clippingBags: 3,
    toolTypes: ['mower'],
    zoneIds: ['lawn'],
    beforePhotoUri: 'file:///doc/mow-photos/before.jpg',
    afterPhotoUri: 'file:///doc/mow-photos/after.jpg',
    weather: { tempF: 72, condition: 'Clear', humidity: 40, capturedAt: 'x' },
    activity: { steps: 2000, distanceMi: 0.9, activeEnergyKcal: 210, source: 'Apple Watch', capturedAt: 'x' },
  },
];

/** Equipment with a v9 record that omits `model`. */
const EQUIPMENT = [
  {
    id: 'eq-1',
    type: 'mower',
    brand: 'Toro',
    model: 'Recycler 22',
    powerSource: 'gas',
    driveType: 'self_propelled',
    catalogId: null,
    createdAt: CREATED,
  },
  {
    id: 'eq-2',
    type: 'trimmer',
    brand: 'Ego',
    powerSource: 'battery',
    catalogId: null,
    createdAt: CREATED,
  },
];

async function seed(version: number, property: unknown) {
  await AsyncStorage.setItem(SCHEMA_VERSION_KEY, String(version));
  await AsyncStorage.setItem(PROPERTIES_KEY, JSON.stringify([property]));
  await AsyncStorage.setItem(MOWS_KEY, JSON.stringify(MOWS));
  await AsyncStorage.setItem(EQUIPMENT_KEY, JSON.stringify(EQUIPMENT));
}

/** The full startup load, exactly as the first screen runs it. Fails fast on a hang. */
async function runStartupLoad(): Promise<void> {
  const load = Promise.all([
    mowRepository.listMows(),
    propertyRepository.getOrCreateDefault(),
    equipmentRepository.list(),
  ]).then(([mows, property]) => {
    // Mirror HomeScreen's post-load render work — a hang here also stalls first paint.
    const areaSqFt = totalAreaSqFt(property.zones);
    deriveStats(mows, { areaSqFt, now: CREATED + 7 * 24 * 3600 * 1000 });
  });

  // Timeout guard so a real hang FAILS the test fast instead of stalling jest.
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error('startup load did not complete (hang)')),
      2000,
    );
  });
  try {
    await Promise.race([load, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

describe('schema migration chain — full startup load reaches current (v15)', () => {
  it('loads a v8 record (zones already populated per the #29 migration)', async () => {
    await seed(8, {
      id: 'prop-1',
      name: 'My Lawn',
      createdAt: CREATED,
      zones: [{ id: 'lawn', name: 'Lawn', vertices: SQUARE, areaSqFt: 5000 }],
    });

    await runStartupLoad();

    const prop = await propertyRepository.getOrCreateDefault();
    expect(prop.zones).toHaveLength(1);
    expect(totalAreaSqFt(prop.zones)).toBe(5000);
  });

  it('loads a v7 record (pre-zones, single boundary)', async () => {
    await seed(7, {
      id: 'prop-1',
      name: 'My Lawn',
      createdAt: CREATED,
      boundary: SQUARE,
      areaSqFt: 5000,
    });

    await runStartupLoad();

    const prop = await propertyRepository.getOrCreateDefault();
    expect(prop.zones).toHaveLength(1);
    expect(prop.zones[0].name).toBe('Lawn');
    // The additive later fields round-trip through the full v7→v14 load.
    const mows = await mowRepository.listMows();
    expect(mows[0].clippingBags).toBe(3);
    expect(mows[0].beforePhotoUri).toBe('file:///doc/mow-photos/before.jpg');
    expect(mows[0].afterPhotoUri).toBe('file:///doc/mow-photos/after.jpg');
    expect(mows[0].zoneIds).toEqual(['lawn']);
    expect(mows[0].activity?.activeEnergyKcal).toBe(210);
  });

  it('reads a v7 mow that has no clippingBags as unset (additive v11 field)', async () => {
    await AsyncStorage.setItem(SCHEMA_VERSION_KEY, '7');
    await AsyncStorage.setItem(
      PROPERTIES_KEY,
      JSON.stringify([
        { id: 'prop-1', name: 'My Lawn', createdAt: CREATED, boundary: SQUARE, areaSqFt: 5000 },
      ]),
    );
    // A pre-v11 mow: every modern field EXCEPT clippingBags.
    await AsyncStorage.setItem(
      MOWS_KEY,
      JSON.stringify([
        { id: 'mow-old', propertyId: 'prop-1', startedAt: CREATED, endedAt: CREATED + 1800 * 1000, durationSeconds: 1800, hocInches: 3 },
      ]),
    );

    await runStartupLoad();

    const mows = await mowRepository.listMows();
    expect(mows).toHaveLength(1);
    expect(mows[0].clippingBags).toBeUndefined(); // absent reads as "not recorded"
    expect(mows[0].hocInches).toBe(3); // untouched
    expect(await AsyncStorage.getItem(SCHEMA_VERSION_KEY)).toBe(String(SCHEMA_VERSION));
  });

  it('reads a v11 mow with no photos as both slots undefined (additive v12 fields)', async () => {
    await AsyncStorage.setItem(SCHEMA_VERSION_KEY, '11');
    await AsyncStorage.setItem(
      PROPERTIES_KEY,
      JSON.stringify([
        { id: 'prop-1', name: 'My Lawn', createdAt: CREATED, zones: [{ id: 'lawn', name: 'Lawn', vertices: SQUARE, areaSqFt: 5000 }] },
      ]),
    );
    // A pre-v12 mow: has the v11 field but neither photo slot.
    await AsyncStorage.setItem(
      MOWS_KEY,
      JSON.stringify([
        { id: 'mow-v11', propertyId: 'prop-1', startedAt: CREATED, endedAt: CREATED + 1800 * 1000, durationSeconds: 1800, clippingBags: 2 },
      ]),
    );

    await runStartupLoad();

    const mows = await mowRepository.listMows();
    expect(mows).toHaveLength(1);
    expect(mows[0].beforePhotoUri).toBeUndefined(); // absent reads as "no photo"
    expect(mows[0].afterPhotoUri).toBeUndefined();
    expect(mows[0].clippingBags).toBe(2); // untouched
    expect(await AsyncStorage.getItem(SCHEMA_VERSION_KEY)).toBe(String(SCHEMA_VERSION));
  });

  it('reads a v12 mow with no zoneIds as whole-lawn (undefined) — additive v13 field', async () => {
    await AsyncStorage.setItem(SCHEMA_VERSION_KEY, '12');
    await AsyncStorage.setItem(
      PROPERTIES_KEY,
      JSON.stringify([
        { id: 'prop-1', name: 'My Lawn', createdAt: CREATED, zones: [{ id: 'lawn', name: 'Lawn', vertices: SQUARE, areaSqFt: 5000 }] },
      ]),
    );
    // A pre-v13 mow: no zoneIds field at all — absence IS "the whole lawn".
    await AsyncStorage.setItem(
      MOWS_KEY,
      JSON.stringify([
        { id: 'mow-v12', propertyId: 'prop-1', startedAt: CREATED, endedAt: CREATED + 1800 * 1000, durationSeconds: 1800, clippingBags: 2 },
      ]),
    );

    await runStartupLoad();

    const mows = await mowRepository.listMows();
    expect(mows).toHaveLength(1);
    expect(mows[0].zoneIds).toBeUndefined(); // absent reads as "whole lawn"; never backfilled
    expect(mows[0].clippingBags).toBe(2); // untouched
    expect(await AsyncStorage.getItem(SCHEMA_VERSION_KEY)).toBe(String(SCHEMA_VERSION));
  });

  it('loads a v9 record (zones + equipment, model optional)', async () => {
    await seed(9, {
      id: 'prop-1',
      name: 'My Lawn',
      createdAt: CREATED,
      zones: [{ id: 'lawn', name: 'Lawn', vertices: SQUARE, areaSqFt: 5000 }],
    });

    await runStartupLoad();

    const equipment = await equipmentRepository.list();
    expect(equipment).toHaveLength(2);
  });

  // THE HANG: a malformed persisted record (a null element in the properties
  // array) made migrateProperty(null) throw during migrate-on-read, the
  // un-caught startup load never resolved, and the app hung on a blank first
  // screen. Fresh installs have no records, so they never hit it.
  it('does not hang when a persisted record is malformed (null element)', async () => {
    await AsyncStorage.setItem(SCHEMA_VERSION_KEY, '8');
    await AsyncStorage.setItem(
      PROPERTIES_KEY,
      JSON.stringify([
        null, // corrupt element — must not throw the whole load
        { id: 'prop-1', name: 'My Lawn', createdAt: CREATED, zones: [{ id: 'lawn', name: 'Lawn', vertices: SQUARE, areaSqFt: 5000 }] },
      ]),
    );
    await AsyncStorage.setItem(MOWS_KEY, JSON.stringify([null, ...MOWS]));
    await AsyncStorage.setItem(EQUIPMENT_KEY, JSON.stringify([null, ...EQUIPMENT]));

    // Would previously reject/hang; now the malformed elements are dropped.
    await runStartupLoad();

    const prop = await propertyRepository.getOrCreateDefault();
    expect(prop.zones).toHaveLength(1); // the good record survived
    expect(await mowRepository.listMows()).toHaveLength(MOWS.length);
    expect(await equipmentRepository.list()).toHaveLength(EQUIPMENT.length);
  });

  it('falls back to a fresh default when the only property record is malformed', async () => {
    await AsyncStorage.setItem(SCHEMA_VERSION_KEY, '8');
    await AsyncStorage.setItem(PROPERTIES_KEY, JSON.stringify([null]));

    await runStartupLoad();

    const prop = await propertyRepository.getOrCreateDefault();
    expect(prop.zones).toEqual([]); // corrupt lawn dropped; app loads with an empty lawn
  });

  it('loads a v10 record (pre-clippings) and advances the stamp to current (v14)', async () => {
    await seed(10, {
      id: 'prop-1',
      name: 'My Lawn',
      createdAt: CREATED,
      zones: [{ id: 'lawn', name: 'Lawn', vertices: SQUARE, areaSqFt: 5000, grassType: 'Bermuda' }],
    });

    await runStartupLoad();

    const prop = await propertyRepository.getOrCreateDefault();
    expect(prop.zones[0].grassType).toBe('Bermuda');
    expect(await AsyncStorage.getItem(SCHEMA_VERSION_KEY)).toBe(String(SCHEMA_VERSION));
  });

  it('reads a v13 mow whose activity has no calories as undefined (additive v14 field)', async () => {
    await AsyncStorage.setItem(SCHEMA_VERSION_KEY, '13');
    await AsyncStorage.setItem(
      PROPERTIES_KEY,
      JSON.stringify([
        { id: 'prop-1', name: 'My Lawn', createdAt: CREATED, zones: [{ id: 'lawn', name: 'Lawn', vertices: SQUARE, areaSqFt: 5000 }] },
      ]),
    );
    // A pre-v14 mow with steps+distance activity but NO calories field.
    await AsyncStorage.setItem(
      MOWS_KEY,
      JSON.stringify([
        {
          id: 'mow-v13', propertyId: 'prop-1', startedAt: CREATED, endedAt: CREATED + 1800 * 1000,
          durationSeconds: 1800,
          activity: { steps: 1500, distanceMi: 0.7, capturedAt: 'x' },
        },
      ]),
    );

    await runStartupLoad();

    const mows = await mowRepository.listMows();
    expect(mows[0].activity?.steps).toBe(1500); // untouched
    expect(mows[0].activity?.activeEnergyKcal).toBeUndefined(); // absent = "no calories"
    expect(await AsyncStorage.getItem(SCHEMA_VERSION_KEY)).toBe(String(SCHEMA_VERSION));
  });

  it('loads a v14 record (pre-location) with the v15 location fields undefined', async () => {
    await seed(14, {
      id: 'prop-1',
      name: 'My Lawn',
      createdAt: CREATED,
      zones: [{ id: 'lawn', name: 'Lawn', vertices: SQUARE, areaSqFt: 5000, grassType: 'Bermuda' }],
    });

    await runStartupLoad();

    const mows = await mowRepository.listMows();
    expect(mows[0].clippingBags).toBe(3); // stored value untouched
    expect(mows[0].beforePhotoUri).toBe('file:///doc/mow-photos/before.jpg'); // photos round-trip
    expect(mows[0].zoneIds).toEqual(['lawn']); // zone coverage round-trips
    expect(mows[0].activity?.activeEnergyKcal).toBe(210); // calories round-trip
    const prop = await propertyRepository.getOrCreateDefault();
    expect(prop.zones[0].grassType).toBe('Bermuda');
    // Additive v15: a pre-location property reads with all four fields absent.
    expect(prop.locationCity).toBeUndefined();
    expect(prop.locationRegion).toBeUndefined();
    expect(prop.locationCountry).toBeUndefined();
    expect(prop.hardinessZone).toBeUndefined();
    expect(await AsyncStorage.getItem(SCHEMA_VERSION_KEY)).toBe(String(SCHEMA_VERSION));
  });

  it('loads a v15 record with disclosed location fields intact (idempotent)', async () => {
    await seed(15, {
      id: 'prop-1',
      name: 'My Lawn',
      createdAt: CREATED,
      zones: [{ id: 'lawn', name: 'Lawn', vertices: SQUARE, areaSqFt: 5000 }],
      locationCity: 'Dallas',
      locationRegion: 'Texas',
      locationCountry: 'US',
      hardinessZone: '8a',
    });

    await runStartupLoad();

    const prop = await propertyRepository.getOrCreateDefault();
    expect(prop.locationCity).toBe('Dallas');
    expect(prop.locationRegion).toBe('Texas');
    expect(prop.locationCountry).toBe('US');
    expect(prop.hardinessZone).toBe('8a');
    expect(await AsyncStorage.getItem(SCHEMA_VERSION_KEY)).toBe(String(SCHEMA_VERSION));
  });

  // The core regression: the chain must advance the stored stamp to the current
  // version from ANY supported starting version (not just n-1). This is exactly
  // what the isolated per-PR tests never checked — each seeded its own fresh
  // version and read once, so the stamp-never-advances bug slipped through.
  it.each([7, 8, 9, 10, 11, 12, 13, 14, 15])(
    'advances the stored schema stamp to current after load (from v%i)',
    async (from) => {
      const property =
        from < 8
          ? { id: 'prop-1', name: 'My Lawn', createdAt: CREATED, boundary: SQUARE, areaSqFt: 5000 }
          : {
              id: 'prop-1',
              name: 'My Lawn',
              createdAt: CREATED,
              zones: [{ id: 'lawn', name: 'Lawn', vertices: SQUARE, areaSqFt: 5000 }],
            };
      await seed(from, property);

      await runStartupLoad();

      expect(await AsyncStorage.getItem(SCHEMA_VERSION_KEY)).toBe(String(SCHEMA_VERSION));

      // Idempotent: a second full load leaves the stamp and data unchanged.
      await runStartupLoad();
      expect(await AsyncStorage.getItem(SCHEMA_VERSION_KEY)).toBe(String(SCHEMA_VERSION));
      const prop = await propertyRepository.getOrCreateDefault();
      expect(prop.zones).toHaveLength(1);
    },
  );
});
