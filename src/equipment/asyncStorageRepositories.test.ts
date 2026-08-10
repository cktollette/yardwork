import AsyncStorage from '@react-native-async-storage/async-storage';
import { SCHEMA_VERSION, SCHEMA_VERSION_KEY } from '../storage/schema';
import { EQUIPMENT_KEY, equipmentRepository } from './asyncStorageRepositories';
import type { NewEquipment } from './models';

// In-memory AsyncStorage mock shipped with the async-storage package.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

beforeEach(async () => {
  await AsyncStorage.clear();
});

/** Build a NewEquipment with sensible defaults; override per-test. */
function makeNewEquipment(overrides: Partial<NewEquipment> = {}): NewEquipment {
  return {
    type: 'mower',
    brand: 'Toro',
    model: 'Recycler 22',
    powerSource: 'gas',
    driveType: 'self_propelled',
    ...overrides,
  };
}

describe('EquipmentRepository CRUD', () => {
  it('adds equipment, assigning id, createdAt, and a null catalogId', async () => {
    const saved = await equipmentRepository.add(makeNewEquipment());
    expect(saved.id).toEqual(expect.any(String));
    expect(saved.createdAt).toEqual(expect.any(Number));
    expect(saved.catalogId).toBeNull();

    const [reloaded] = await equipmentRepository.list();
    expect(reloaded).toEqual(saved);
  });

  it('assigns a distinct id to each item', async () => {
    const a = await equipmentRepository.add(makeNewEquipment());
    const b = await equipmentRepository.add(makeNewEquipment());
    expect(a.id).not.toBe(b.id);
  });

  it('normalizes on add: drops driveType for a non-mower', async () => {
    const saved = await equipmentRepository.add(
      makeNewEquipment({ type: 'trimmer', driveType: 'push' }),
    );
    expect('driveType' in saved).toBe(false);
  });

  it('finds an item by id and returns null for an unknown id', async () => {
    const saved = await equipmentRepository.add(makeNewEquipment());
    expect(await equipmentRepository.getById(saved.id)).toEqual(saved);
    expect(await equipmentRepository.getById('nope')).toBeNull();
  });

  it('lists newest first by createdAt', async () => {
    const older = await equipmentRepository.add(makeNewEquipment({ brand: 'Honda' }));
    const newer = await equipmentRepository.add(makeNewEquipment({ brand: 'Ariens' }));
    // Force a deterministic ordering regardless of same-ms creation.
    await AsyncStorage.setItem(
      EQUIPMENT_KEY,
      JSON.stringify([
        { ...older, createdAt: 1000 },
        { ...newer, createdAt: 2000 },
      ]),
    );
    const brands = (await equipmentRepository.list()).map((e) => e.brand);
    expect(brands).toEqual(['Ariens', 'Honda']);
  });

  it('returns an empty list when nothing is saved', async () => {
    expect(await equipmentRepository.list()).toEqual([]);
  });
});

describe('EquipmentRepository.update', () => {
  it('applies a patch and persists it', async () => {
    const saved = await equipmentRepository.add(makeNewEquipment());
    const updated = await equipmentRepository.update(saved.id, {
      nickname: 'Old Reliable',
      powerSource: 'battery',
    });
    expect(updated.nickname).toBe('Old Reliable');
    expect(updated.powerSource).toBe('battery');
    expect(await equipmentRepository.getById(saved.id)).toEqual(updated);
  });

  it('drops driveType when a mower is edited into another type', async () => {
    const saved = await equipmentRepository.add(makeNewEquipment({ driveType: 'ride' }));
    const updated = await equipmentRepository.update(saved.id, { type: 'blower' });
    expect('driveType' in updated).toBe(false);
    expect((await equipmentRepository.getById(saved.id)) as object).not.toHaveProperty(
      'driveType',
    );
  });

  it('rejects an update to an unknown id', async () => {
    await expect(
      equipmentRepository.update('nope', { brand: 'Honda' }),
    ).rejects.toThrow(/nope/);
  });
});

describe('EquipmentRepository.delete', () => {
  it('removes the item, leaving the others intact', async () => {
    const a = await equipmentRepository.add(makeNewEquipment({ brand: 'Honda' }));
    const b = await equipmentRepository.add(makeNewEquipment({ brand: 'Ariens' }));

    await equipmentRepository.delete(a.id);

    const remaining = await equipmentRepository.list();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(b.id);
  });

  it('is idempotent: deleting an unknown or already-deleted id does not throw', async () => {
    const saved = await equipmentRepository.add(makeNewEquipment());

    await expect(equipmentRepository.delete('never-existed')).resolves.toBeUndefined();
    await expect(equipmentRepository.delete(saved.id)).resolves.toBeUndefined();
    await expect(equipmentRepository.delete(saved.id)).resolves.toBeUndefined(); // again, no-op

    expect(await equipmentRepository.list()).toEqual([]);
  });
});

describe('EquipmentRepository schema stamp', () => {
  it('stamps the current schema version on first access', async () => {
    expect(await AsyncStorage.getItem(SCHEMA_VERSION_KEY)).toBeNull();
    await equipmentRepository.list();
    expect(await AsyncStorage.getItem(SCHEMA_VERSION_KEY)).toBe(String(SCHEMA_VERSION));
  });
});
