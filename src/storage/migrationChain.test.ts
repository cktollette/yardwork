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

/** Realistic mows with the fields added across v3–v7 (hoc/tools/weather/activity). */
const MOWS = [
  {
    id: 'mow-1',
    propertyId: 'prop-1',
    startedAt: CREATED,
    endedAt: CREATED + 1800 * 1000,
    durationSeconds: 1800,
    hocInches: 2.5,
    toolTypes: ['mower'],
    weather: { tempF: 72, condition: 'Clear', humidity: 40, capturedAt: 'x' },
    activity: { steps: 2000, distanceMi: 0.9, source: 'Apple Watch', capturedAt: 'x' },
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

describe('schema migration chain — full startup load reaches v10', () => {
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

  it('loads a v10 record (already current) as an idempotent no-op', async () => {
    await seed(10, {
      id: 'prop-1',
      name: 'My Lawn',
      createdAt: CREATED,
      zones: [{ id: 'lawn', name: 'Lawn', vertices: SQUARE, areaSqFt: 5000, grassType: 'Bermuda' }],
    });

    await runStartupLoad();

    const prop = await propertyRepository.getOrCreateDefault();
    expect(prop.zones[0].grassType).toBe('Bermuda');
    expect(await AsyncStorage.getItem(SCHEMA_VERSION_KEY)).toBe('10');
  });

  // The core regression: the chain must advance the stored stamp to the current
  // version from ANY supported starting version (not just n-1). This is exactly
  // what the isolated per-PR tests never checked — each seeded its own fresh
  // version and read once, so the stamp-never-advances bug slipped through.
  it.each([7, 8, 9, 10])(
    'advances the stored schema stamp to %i-and-up → current after load (from v%i)',
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
