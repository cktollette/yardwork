import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_PROPERTY_NAME,
  MOWS_KEY,
  mowRepository,
  propertyRepository,
} from './asyncStorageRepositories';
import type { NewMow, Position } from './models';
import { SCHEMA_VERSION, SCHEMA_VERSION_KEY } from '../storage/schema';

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

describe('MowRepository — hocInches (schema v3, additive)', () => {
  it('round-trips a mow saved with a height of cut', async () => {
    const saved = await mowRepository.saveMow(makeNewMow({ hocInches: 2.5 }));
    expect(saved.hocInches).toBe(2.5);

    const [reloaded] = await mowRepository.listMows();
    expect(reloaded.hocInches).toBe(2.5);
  });

  it('reads a pre-v3 record with no hocInches as undefined (no transform needed)', async () => {
    // An old record written before v3 existed: no hocInches key at all.
    const legacy = {
      id: 'legacy-1',
      propertyId: 'prop-1',
      startedAt: 1_700_000_000_000,
      endedAt: 1_700_000_000_000 + 2400 * 1000,
      durationSeconds: 2400,
    };
    await AsyncStorage.setItem(MOWS_KEY, JSON.stringify([legacy]));

    const byId = await mowRepository.getMowById('legacy-1');
    expect(byId).not.toBeNull();
    expect(byId?.hocInches).toBeUndefined();

    const [listed] = await mowRepository.listMows();
    expect(listed.hocInches).toBeUndefined();
  });

  it('sets hocInches on an old record via update', async () => {
    const legacy = {
      id: 'legacy-2',
      propertyId: 'prop-1',
      startedAt: 1_700_000_000_000,
      endedAt: 1_700_000_000_000 + 2400 * 1000,
      durationSeconds: 2400,
    };
    await AsyncStorage.setItem(MOWS_KEY, JSON.stringify([legacy]));

    const updated = await mowRepository.update('legacy-2', { hocInches: 3 });
    expect(updated.hocInches).toBe(3);
    expect((await mowRepository.getMowById('legacy-2'))?.hocInches).toBe(3);
  });

  it('clears hocInches via update with an undefined patch value', async () => {
    const saved = await mowRepository.saveMow(makeNewMow({ hocInches: 2 }));
    const updated = await mowRepository.update(saved.id, { hocInches: undefined });
    expect('hocInches' in updated).toBe(false);
    expect((await mowRepository.getMowById(saved.id))?.hocInches).toBeUndefined();
  });
});

describe('MowRepository — toolTypes (schema v5, additive)', () => {
  it('round-trips a mow saved with toolTypes', async () => {
    const saved = await mowRepository.saveMow(
      makeNewMow({ toolTypes: ['mower', 'trimmer'] }),
    );
    expect(saved.toolTypes).toEqual(['mower', 'trimmer']);

    const [reloaded] = await mowRepository.listMows();
    expect(reloaded.toolTypes).toEqual(['mower', 'trimmer']);
  });

  it('reads a pre-v5 record with no toolTypes as undefined (no transform)', async () => {
    // An old record written before v5: no toolTypes key at all.
    const legacy = {
      id: 'legacy-tools',
      propertyId: 'prop-1',
      startedAt: 1_700_000_000_000,
      endedAt: 1_700_000_000_000 + 2400 * 1000,
      durationSeconds: 2400,
    };
    await AsyncStorage.setItem(MOWS_KEY, JSON.stringify([legacy]));

    const byId = await mowRepository.getMowById('legacy-tools');
    expect(byId).not.toBeNull();
    expect(byId?.toolTypes).toBeUndefined();

    const [listed] = await mowRepository.listMows();
    expect(listed.toolTypes).toBeUndefined();
  });

  it('sets and clears toolTypes via update', async () => {
    const saved = await mowRepository.saveMow(makeNewMow());
    const set = await mowRepository.update(saved.id, { toolTypes: ['mower'] });
    expect(set.toolTypes).toEqual(['mower']);

    const cleared = await mowRepository.update(saved.id, { toolTypes: [] });
    expect('toolTypes' in cleared).toBe(false);
    expect((await mowRepository.getMowById(saved.id))?.toolTypes).toBeUndefined();
  });
});

describe('MowRepository.update', () => {
  it('applies a patch and persists it', async () => {
    const saved = await mowRepository.saveMow(makeNewMow({ notes: 'before' }));
    const newStart = saved.startedAt + 3 * 86_400_000;

    const updated = await mowRepository.update(saved.id, {
      startedAt: newStart,
      notes: 'after',
    });

    expect(updated.startedAt).toBe(newStart);
    expect(updated.durationSeconds).toBe(saved.durationSeconds); // preserved
    expect(updated.endedAt).toBe(newStart + saved.durationSeconds * 1000);
    expect(updated.notes).toBe('after');

    // Persisted, not just returned.
    expect(await mowRepository.getMowById(saved.id)).toEqual(updated);
  });

  it('rejects an update to an unknown id', async () => {
    await expect(mowRepository.update('nope', { durationSeconds: 60 })).rejects.toThrow(
      /nope/,
    );
  });

  it('rejects an invalid edit and writes nothing', async () => {
    const saved = await mowRepository.saveMow(makeNewMow());

    await expect(mowRepository.update(saved.id, { durationSeconds: 0 })).rejects.toThrow();

    // The stored mow is untouched.
    expect(await mowRepository.getMowById(saved.id)).toEqual(saved);
  });
});

describe('MowRepository.delete', () => {
  it('removes the mow, leaving the others intact', async () => {
    const a = await mowRepository.saveMow(makeNewMow({ startedAt: 1 }));
    const b = await mowRepository.saveMow(makeNewMow({ startedAt: 2 }));

    await mowRepository.delete(a.id);

    const remaining = await mowRepository.listMows();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(b.id);
  });

  it('is idempotent: deleting an unknown or already-deleted id does not throw', async () => {
    const saved = await mowRepository.saveMow(makeNewMow());

    await expect(mowRepository.delete('never-existed')).resolves.toBeUndefined();
    await expect(mowRepository.delete(saved.id)).resolves.toBeUndefined();
    await expect(mowRepository.delete(saved.id)).resolves.toBeUndefined(); // again, no-op

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

describe('PropertyRepository lawn boundary', () => {
  // A small triangle — the minimum valid polygon.
  const TRIANGLE: Position[] = [
    [0, 0],
    [0.001, 0],
    [0, 0.001],
  ];

  it('saves a boundary and stores a positive computed area', async () => {
    const { id } = await propertyRepository.getOrCreateDefault();
    const updated = await propertyRepository.saveBoundary(id, TRIANGLE);

    expect(updated.boundary).toEqual(TRIANGLE);
    expect(updated.areaSqFt).toBeGreaterThan(0);

    // Persisted, not just returned.
    const reloaded = await propertyRepository.getById(id);
    expect(reloaded?.boundary).toEqual(TRIANGLE);
    expect(reloaded?.areaSqFt).toBe(updated.areaSqFt);
  });

  it('replaces the existing polygon rather than adding one (one per property)', async () => {
    const { id } = await propertyRepository.getOrCreateDefault();
    await propertyRepository.saveBoundary(id, TRIANGLE);

    const bigger: Position[] = [
      [0, 0],
      [0.002, 0],
      [0.002, 0.002],
      [0, 0.002],
    ];
    const updated = await propertyRepository.saveBoundary(id, bigger);

    expect(updated.boundary).toEqual(bigger);
    // Still exactly one Property; the boundary was swapped, not appended.
    const reloaded = await propertyRepository.getById(id);
    expect(reloaded?.boundary).toEqual(bigger);
  });

  it('rejects a boundary with fewer than 3 vertices and writes nothing', async () => {
    const { id, areaSqFt } = await propertyRepository.getOrCreateDefault();
    expect(areaSqFt ?? null).toBeNull();

    await expect(
      propertyRepository.saveBoundary(id, [[0, 0], [1, 1]]),
    ).rejects.toThrow(/at least 3/);

    const reloaded = await propertyRepository.getById(id);
    expect(reloaded?.boundary ?? null).toBeNull();
  });

  it('rejects saving to an unknown property id', async () => {
    await expect(
      propertyRepository.saveBoundary('nope', TRIANGLE),
    ).rejects.toThrow(/nope/);
  });

  it('clears a boundary back to null area', async () => {
    const { id } = await propertyRepository.getOrCreateDefault();
    await propertyRepository.saveBoundary(id, TRIANGLE);

    const cleared = await propertyRepository.clearBoundary(id);
    expect(cleared.boundary).toBeNull();
    expect(cleared.areaSqFt).toBeNull();

    const reloaded = await propertyRepository.getById(id);
    expect(reloaded?.boundary).toBeNull();
  });

  it('returns null from getById for an unknown id', async () => {
    expect(await propertyRepository.getById('missing')).toBeNull();
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
