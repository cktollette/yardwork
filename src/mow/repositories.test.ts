import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_PROPERTY_NAME,
  MOWS_KEY,
  PROPERTIES_KEY,
  mowRepository,
  propertyRepository,
} from './asyncStorageRepositories';
import type { Mow, NewMow, Position } from './models';
import { SCHEMA_VERSION, SCHEMA_VERSION_KEY } from '../storage/schema';

// In-memory AsyncStorage mock shipped with the async-storage package.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// PhotoStore is mocked so we can assert the repository's copy/delete file calls
// without any real filesystem. copyIntoStore returns a deterministic app URI
// derived from the source, so tests can assert the STORED (app) URI vs the temp.
jest.mock('../photos', () => ({
  photoStore: {
    copyIntoStore: jest.fn(async (uri: string) => `file:///app/mow-photos/copied-${uri.split('/').pop()}`),
    deleteFile: jest.fn(async () => undefined),
  },
}));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { photoStore } = require('../photos');

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
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

describe('MowRepository — photo file lifecycle', () => {
  it('copies a picked temp URI into the store on save and persists the APP URI', async () => {
    const saved = await mowRepository.saveMow(
      makeNewMow({ beforePhotoUri: 'file:///tmp/before.jpg' }),
    );
    expect(photoStore.copyIntoStore).toHaveBeenCalledWith('file:///tmp/before.jpg');
    // The stored URI is the copied app URI, never the picker temp URI.
    expect(saved.beforePhotoUri).toBe('file:///app/mow-photos/copied-before.jpg');
    const stored = JSON.parse((await AsyncStorage.getItem(MOWS_KEY)) as string)[0];
    expect(stored.beforePhotoUri).toBe('file:///app/mow-photos/copied-before.jpg');
  });

  it('does not touch the photo store when a save has no photos', async () => {
    await mowRepository.saveMow(makeNewMow());
    expect(photoStore.copyIntoStore).not.toHaveBeenCalled();
    expect(photoStore.deleteFile).not.toHaveBeenCalled();
  });

  it('on replace: copies the new photo and deletes the SUPERSEDED old file only', async () => {
    const saved = await mowRepository.saveMow(
      makeNewMow({ beforePhotoUri: 'file:///tmp/before.jpg' }),
    );
    const oldUri = saved.beforePhotoUri; // file:///app/mow-photos/copied-before.jpg
    jest.clearAllMocks();

    const updated = await mowRepository.update(saved.id, {
      beforePhotoUri: 'file:///tmp/new.jpg',
    });

    expect(photoStore.copyIntoStore).toHaveBeenCalledWith('file:///tmp/new.jpg');
    expect(updated.beforePhotoUri).toBe('file:///app/mow-photos/copied-new.jpg');
    // Superseded old file deleted; the new file is NOT deleted.
    expect(photoStore.deleteFile).toHaveBeenCalledWith(oldUri);
    expect(photoStore.deleteFile).not.toHaveBeenCalledWith('file:///app/mow-photos/copied-new.jpg');
    expect(photoStore.deleteFile).toHaveBeenCalledTimes(1);
  });

  it('on clear: deletes the old file and stores no URI', async () => {
    const saved = await mowRepository.saveMow(
      makeNewMow({ beforePhotoUri: 'file:///tmp/before.jpg' }),
    );
    const oldUri = saved.beforePhotoUri;
    jest.clearAllMocks();

    const updated = await mowRepository.update(saved.id, { beforePhotoUri: undefined });

    expect(updated.beforePhotoUri).toBeUndefined();
    expect(photoStore.copyIntoStore).not.toHaveBeenCalled();
    expect(photoStore.deleteFile).toHaveBeenCalledWith(oldUri);
    expect(photoStore.deleteFile).toHaveBeenCalledTimes(1);
  });

  it('on an unrelated edit: leaves photo files untouched', async () => {
    const saved = await mowRepository.saveMow(
      makeNewMow({ beforePhotoUri: 'file:///tmp/before.jpg' }),
    );
    jest.clearAllMocks();

    const updated = await mowRepository.update(saved.id, { notes: 'nice' });

    expect(photoStore.copyIntoStore).not.toHaveBeenCalled();
    expect(photoStore.deleteFile).not.toHaveBeenCalled();
    expect(updated.beforePhotoUri).toBe('file:///app/mow-photos/copied-before.jpg');
  });

  it('on delete: deletes BOTH slot files, then removes the record', async () => {
    const saved = await mowRepository.saveMow(
      makeNewMow({ beforePhotoUri: 'file:///tmp/b.jpg', afterPhotoUri: 'file:///tmp/a.jpg' }),
    );
    jest.clearAllMocks();

    await mowRepository.delete(saved.id);

    expect(photoStore.deleteFile).toHaveBeenCalledWith('file:///app/mow-photos/copied-b.jpg');
    expect(photoStore.deleteFile).toHaveBeenCalledWith('file:///app/mow-photos/copied-a.jpg');
    expect(photoStore.deleteFile).toHaveBeenCalledTimes(2);
    expect(await mowRepository.getMowById(saved.id)).toBeNull();
  });

  it('on delete of a photoless mow: removes the record without any file delete', async () => {
    const saved = await mowRepository.saveMow(makeNewMow());
    jest.clearAllMocks();

    await mowRepository.delete(saved.id);

    expect(photoStore.deleteFile).not.toHaveBeenCalled();
    expect(await mowRepository.getMowById(saved.id)).toBeNull();
  });

  it('on delete of an unknown id: no file delete, no throw (idempotent)', async () => {
    await expect(mowRepository.delete('nope')).resolves.toBeUndefined();
    expect(photoStore.deleteFile).not.toHaveBeenCalled();
  });
});

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

  it('persists zoneIds when the mow covered a subset of zones', async () => {
    const saved = await mowRepository.saveMow(makeNewMow({ zoneIds: ['z1', 'z2'] }));
    expect(saved.zoneIds).toEqual(['z1', 'z2']);
    expect((await mowRepository.getMowById(saved.id))?.zoneIds).toEqual(['z1', 'z2']);
  });

  it('stores no zoneIds for a whole-lawn mow (absent, never backfilled)', async () => {
    const saved = await mowRepository.saveMow(makeNewMow());
    expect('zoneIds' in saved).toBe(false);
    expect((await mowRepository.getMowById(saved.id))?.zoneIds).toBeUndefined();
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
  it('creates a default "My Lawn" Property with no zones on first call', async () => {
    const property = await propertyRepository.getOrCreateDefault();
    expect(property.name).toBe(DEFAULT_PROPERTY_NAME);
    expect(property.id).toEqual(expect.any(String));
    expect(property.createdAt).toEqual(expect.any(Number));
    expect(property.zones).toEqual([]);
  });

  it('is idempotent: calling twice returns the same Property', async () => {
    const first = await propertyRepository.getOrCreateDefault();
    const second = await propertyRepository.getOrCreateDefault();
    expect(second).toEqual(first);
  });
});

describe('PropertyRepository zones', () => {
  // A small triangle — the minimum valid polygon.
  const TRIANGLE: Position[] = [
    [0, 0],
    [0.001, 0],
    [0, 0.001],
  ];
  const SQUARE: Position[] = [
    [0, 0],
    [0.002, 0],
    [0.002, 0.002],
    [0, 0.002],
  ];

  it('adds a zone with a computed area and the default first name "Lawn"', async () => {
    const { id } = await propertyRepository.getOrCreateDefault();
    const updated = await propertyRepository.addZone(id, { vertices: TRIANGLE });

    expect(updated.zones).toHaveLength(1);
    const [zone] = updated.zones;
    expect(zone.name).toBe('Lawn');
    expect(zone.vertices).toEqual(TRIANGLE);
    expect(zone.areaSqFt).toBeGreaterThan(0);

    // Persisted, not just returned.
    const reloaded = await propertyRepository.getById(id);
    expect(reloaded?.zones).toEqual(updated.zones);
  });

  it('names subsequent zones "Zone 2", "Zone 3", … and keeps prior zones', async () => {
    const { id } = await propertyRepository.getOrCreateDefault();
    await propertyRepository.addZone(id, { vertices: TRIANGLE });
    const two = await propertyRepository.addZone(id, { vertices: SQUARE });
    const three = await propertyRepository.addZone(id, { vertices: TRIANGLE, name: 'Side' });

    expect(two.zones.map((z) => z.name)).toEqual(['Lawn', 'Zone 2']);
    expect(three.zones.map((z) => z.name)).toEqual(['Lawn', 'Zone 2', 'Side']);
  });

  it('updates a zone name and re-traces vertices, recomputing area', async () => {
    const { id } = await propertyRepository.getOrCreateDefault();
    const added = await propertyRepository.addZone(id, { vertices: TRIANGLE });
    const zoneId = added.zones[0].id;
    const smallArea = added.zones[0].areaSqFt;

    const renamed = await propertyRepository.updateZone(id, zoneId, { name: 'Back' });
    expect(renamed.zones[0].name).toBe('Back');
    expect(renamed.zones[0].vertices).toEqual(TRIANGLE); // unchanged
    expect(renamed.zones[0].areaSqFt).toBe(smallArea);

    const retraced = await propertyRepository.updateZone(id, zoneId, { vertices: SQUARE });
    expect(retraced.zones[0].vertices).toEqual(SQUARE);
    expect(retraced.zones[0].areaSqFt).toBeGreaterThan(smallArea);
    expect(retraced.zones[0].name).toBe('Back'); // preserved
  });

  it('sets, persists, and clears a zone grass type (optional)', async () => {
    const { id } = await propertyRepository.getOrCreateDefault();
    const added = await propertyRepository.addZone(id, { vertices: TRIANGLE });
    const zoneId = added.zones[0].id;

    // Absent by default.
    expect('grassType' in added.zones[0]).toBe(false);

    // Set it — persisted, and unrelated fields preserved.
    const tagged = await propertyRepository.updateZone(id, zoneId, { grassType: 'Bermuda' });
    expect(tagged.zones[0].grassType).toBe('Bermuda');
    expect(tagged.zones[0].vertices).toEqual(TRIANGLE);
    expect((await propertyRepository.getById(id))?.zones[0].grassType).toBe('Bermuda');

    // A name-only edit leaves grass type untouched (omitted key).
    const renamed = await propertyRepository.updateZone(id, zoneId, { name: 'Front' });
    expect(renamed.zones[0].grassType).toBe('Bermuda');

    // Clear it — present key with undefined value drops it.
    const cleared = await propertyRepository.updateZone(id, zoneId, { grassType: undefined });
    expect('grassType' in cleared.zones[0]).toBe(false);
  });

  it('rejects a zone with fewer than 3 vertices and writes nothing', async () => {
    const { id } = await propertyRepository.getOrCreateDefault();

    await expect(
      propertyRepository.addZone(id, { vertices: [[0, 0], [1, 1]] }),
    ).rejects.toThrow(/at least 3/);

    expect((await propertyRepository.getById(id))?.zones).toEqual([]);
  });

  it('rejects add/update against an unknown property or zone id', async () => {
    const { id } = await propertyRepository.getOrCreateDefault();
    await expect(
      propertyRepository.addZone('nope', { vertices: TRIANGLE }),
    ).rejects.toThrow(/nope/);
    await expect(
      propertyRepository.updateZone(id, 'ghost', { name: 'x' }),
    ).rejects.toThrow(/ghost/);
  });

  it('deletes a zone, and deleting the last one leaves a valid empty lawn', async () => {
    const { id } = await propertyRepository.getOrCreateDefault();
    const added = await propertyRepository.addZone(id, { vertices: TRIANGLE });
    const zoneId = added.zones[0].id;

    // Idempotent: deleting an unknown id is a no-op, not an error.
    const noop = await propertyRepository.deleteZone(id, 'ghost');
    expect(noop.zones).toHaveLength(1);

    const emptied = await propertyRepository.deleteZone(id, zoneId);
    expect(emptied.zones).toEqual([]);
    expect((await propertyRepository.getById(id))?.zones).toEqual([]);
  });

  it('returns null from getById for an unknown id', async () => {
    expect(await propertyRepository.getById('missing')).toBeNull();
  });
});

describe('PropertyRepository — v7→v8 migration on load', () => {
  const SQUARE: Position[] = [
    [0, 0],
    [0.001, 0],
    [0.001, 0.001],
    [0, 0.001],
  ];

  it('loads a stored v7 single-boundary property as one "Lawn" zone', async () => {
    // Seed a raw pre-migration record (boundary + areaSqFt, no zones).
    const legacy = {
      id: 'prop-legacy',
      name: 'My Lawn',
      createdAt: 1_700_000_000_000,
      boundary: SQUARE,
      areaSqFt: 4321,
    };
    await AsyncStorage.setItem(PROPERTIES_KEY, JSON.stringify([legacy]));

    const loaded = await propertyRepository.getById('prop-legacy');
    expect(loaded?.zones).toHaveLength(1);
    expect(loaded?.zones[0].name).toBe('Lawn');
    expect(loaded?.zones[0].vertices).toEqual(SQUARE);
    expect(loaded?.zones[0].areaSqFt).toBe(4321); // stored area preserved
    expect(loaded).not.toHaveProperty('boundary');
  });

  it('leaves v7 mow records (weather + activity) untouched by the property migration', async () => {
    const startedAt = 1_700_000_000_000;
    const legacyMow: Mow = {
      id: 'mow-legacy',
      propertyId: 'prop-legacy',
      startedAt,
      endedAt: startedAt + 1800 * 1000,
      durationSeconds: 1800,
      weather: { tempF: 70, condition: 'Clear', humidity: 40, capturedAt: 'x' },
      activity: { steps: 100, distanceMi: 0.1, capturedAt: 'x' },
    };
    await AsyncStorage.setItem(MOWS_KEY, JSON.stringify([legacyMow]));

    // Touch the property migration path, then read the mow back.
    await propertyRepository.getOrCreateDefault();
    const [mow] = await mowRepository.listMows();
    expect(mow).toEqual(legacyMow);
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
