import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_PROPERTY_NAME,
  MOWS_KEY,
  mowRepository,
  propertyRepository,
} from './asyncStorageRepositories';
import type { NewMow } from './models';
import { SCHEMA_VERSION, SCHEMA_VERSION_KEY } from './schema';

// In-memory AsyncStorage mock shipped with the async-storage package.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

beforeEach(async () => {
  await AsyncStorage.clear();
});

/** Build a NewMow with sensible defaults; override per-test. */
function makeNewMow(overrides: Partial<NewMow> = {}): NewMow {
  const startedAt = 1_700_000_000_000;
  return {
    propertyId: 'prop-1',
    startedAt,
    endedAt: startedAt + 2400 * 1000,
    durationSeconds: 2400,
    ...overrides,
  };
}

describe('MowRepository', () => {
  it('round-trips a saved mow through listMows', async () => {
    const saved = await mowRepository.saveMow(makeNewMow({ notes: 'first cut' }));
    expect(saved.id).toEqual(expect.any(String));

    const mows = await mowRepository.listMows();
    expect(mows).toHaveLength(1);
    expect(mows[0]).toEqual(saved);
    expect(mows[0].notes).toBe('first cut');
  });

  it('assigns a distinct id to each saved mow', async () => {
    const a = await mowRepository.saveMow(makeNewMow());
    const b = await mowRepository.saveMow(makeNewMow());
    expect(a.id).not.toBe(b.id);
  });

  it('lists mows reverse-chronologically by startedAt (newest first)', async () => {
    const base = 1_700_000_000_000;
    // Save out of order to prove the repository sorts, not insertion order.
    await mowRepository.saveMow(makeNewMow({ startedAt: base + 2000 }));
    await mowRepository.saveMow(makeNewMow({ startedAt: base }));
    await mowRepository.saveMow(makeNewMow({ startedAt: base + 1000 }));

    const starts = (await mowRepository.listMows()).map((m) => m.startedAt);
    expect(starts).toEqual([base + 2000, base + 1000, base]);
  });

  it('finds a mow by id and returns null for an unknown id', async () => {
    const saved = await mowRepository.saveMow(makeNewMow());
    expect(await mowRepository.getMowById(saved.id)).toEqual(saved);
    expect(await mowRepository.getMowById('nope')).toBeNull();
  });

  it('rejects a mow with no propertyId and persists nothing (no orphan mows)', async () => {
    await expect(
      mowRepository.saveMow(makeNewMow({ propertyId: '' })),
    ).rejects.toThrow(/propertyId/);

    // Nothing was written under the mows key.
    expect(await AsyncStorage.getItem(MOWS_KEY)).toBeNull();
    expect(await mowRepository.listMows()).toEqual([]);
  });

  it('returns an empty list when nothing is saved', async () => {
    expect(await mowRepository.listMows()).toEqual([]);
  });
});

describe('PropertyRepository.getOrCreateDefault', () => {
  it('creates a default "My Lawn" Property on first call', async () => {
    const property = await propertyRepository.getOrCreateDefault();
    expect(property.name).toBe(DEFAULT_PROPERTY_NAME);
    expect(property.id).toEqual(expect.any(String));
    expect(property.createdAt).toEqual(expect.any(Number));
  });

  it('is idempotent: calling twice returns the same Property', async () => {
    const first = await propertyRepository.getOrCreateDefault();
    const second = await propertyRepository.getOrCreateDefault();
    expect(second).toEqual(first);
  });
});

describe('schema version stamp', () => {
  it('stamps the current version on first repository access', async () => {
    expect(await AsyncStorage.getItem(SCHEMA_VERSION_KEY)).toBeNull();
    await mowRepository.listMows();
    expect(await AsyncStorage.getItem(SCHEMA_VERSION_KEY)).toBe(
      String(SCHEMA_VERSION),
    );
  });

  it('does not overwrite an already-stamped version', async () => {
    // A future/older stamp planted by a prior app version must survive.
    await AsyncStorage.setItem(SCHEMA_VERSION_KEY, '99');
    await mowRepository.saveMow(makeNewMow());
    expect(await AsyncStorage.getItem(SCHEMA_VERSION_KEY)).toBe('99');
  });
});
