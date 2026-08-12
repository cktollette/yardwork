import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from '../mow/id';
import { ensureSchemaVersion } from '../storage/schema';
import { applyEquipmentEdit, normalizeEquipment } from './equipment';
import type { Equipment, NewEquipment } from './models';
import type { EquipmentEdit } from './models';
import type { EquipmentRepository } from './repositories';

export const EQUIPMENT_KEY = '@yardwork/equipment';

/**
 * Read + JSON-parse an array-valued key, returning [] on missing or corrupt
 * data. Never throws — a bad value reads as "empty", matching the defensive
 * style of the mow repository.
 */
async function readArray<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Drop null/non-object elements so a single malformed record can't throw
    // when a caller dereferences it (matches the mow repo's readArray).
    return parsed.filter((el) => el != null && typeof el === 'object') as T[];
  } catch {
    return [];
  }
}

class AsyncStorageEquipmentRepository implements EquipmentRepository {
  async list(): Promise<Equipment[]> {
    await ensureSchemaVersion();
    const equipment = await readArray<Equipment>(EQUIPMENT_KEY);
    // Newest first by createdAt.
    return equipment.sort((a, b) => b.createdAt - a.createdAt);
  }

  async getById(id: string): Promise<Equipment | null> {
    await ensureSchemaVersion();
    const equipment = await readArray<Equipment>(EQUIPMENT_KEY);
    return equipment.find((e) => e.id === id) ?? null;
  }

  async add(input: NewEquipment): Promise<Equipment> {
    await ensureSchemaVersion();
    // Repo assigns id/createdAt and the reserved catalogId (null); normalize so
    // stored data honors the invariants (trimmed strings, mower-only driveType).
    const equipment = normalizeEquipment({
      ...input,
      id: generateId(),
      createdAt: Date.now(),
      catalogId: null,
    });
    const all = await readArray<Equipment>(EQUIPMENT_KEY);
    all.push(equipment);
    await AsyncStorage.setItem(EQUIPMENT_KEY, JSON.stringify(all));
    return equipment;
  }

  async update(id: string, patch: EquipmentEdit): Promise<Equipment> {
    await ensureSchemaVersion();
    const all = await readArray<Equipment>(EQUIPMENT_KEY);
    const index = all.findIndex((e) => e.id === id);
    if (index === -1) {
      throw new Error(`No equipment with id ${id}`);
    }
    const updated = applyEquipmentEdit(all[index], patch);
    all[index] = updated;
    await AsyncStorage.setItem(EQUIPMENT_KEY, JSON.stringify(all));
    return updated;
  }

  async delete(id: string): Promise<void> {
    await ensureSchemaVersion();
    const all = await readArray<Equipment>(EQUIPMENT_KEY);
    const remaining = all.filter((e) => e.id !== id);
    // Idempotent (D-027): only write when something actually changed.
    if (remaining.length !== all.length) {
      await AsyncStorage.setItem(EQUIPMENT_KEY, JSON.stringify(remaining));
    }
  }
}

/**
 * Concrete singleton, typed as the interface so screens import behavior, not
 * implementation. Swapping to Supabase later means changing only this binding.
 */
export const equipmentRepository: EquipmentRepository =
  new AsyncStorageEquipmentRepository();
