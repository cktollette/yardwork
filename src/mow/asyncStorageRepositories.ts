import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from './id';
import type { Mow, NewMow, Property } from './models';
import type { MowRepository, PropertyRepository } from './repositories';
import { ensureSchemaVersion } from './schema';

export const MOWS_KEY = '@yardwork/mows';
export const PROPERTIES_KEY = '@yardwork/properties';

/** Name of the Property auto-created on the first mow save (D-005). */
export const DEFAULT_PROPERTY_NAME = 'My Lawn';

/**
 * Read + JSON-parse an array-valued key, returning [] on missing or corrupt
 * data. Never throws — a bad value must not crash the app; it reads as "empty",
 * matching the defensive style of loadRunningTimer().
 */
async function readArray<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

class AsyncStorageMowRepository implements MowRepository {
  async saveMow(input: NewMow): Promise<Mow> {
    // No orphan mows, ever (D-005). Checked before any write, so a rejected
    // save persists nothing.
    if (!input.propertyId) {
      throw new Error('Cannot save a mow without a propertyId');
    }
    await ensureSchemaVersion();
    const mow: Mow = { ...input, id: generateId() };
    const mows = await readArray<Mow>(MOWS_KEY);
    mows.push(mow);
    await AsyncStorage.setItem(MOWS_KEY, JSON.stringify(mows));
    return mow;
  }

  async listMows(): Promise<Mow[]> {
    await ensureSchemaVersion();
    const mows = await readArray<Mow>(MOWS_KEY);
    // Reverse-chronological by start time (newest first).
    return mows.sort((a, b) => b.startedAt - a.startedAt);
  }

  async getMowById(id: string): Promise<Mow | null> {
    await ensureSchemaVersion();
    const mows = await readArray<Mow>(MOWS_KEY);
    return mows.find((m) => m.id === id) ?? null;
  }
}

class AsyncStoragePropertyRepository implements PropertyRepository {
  async getOrCreateDefault(): Promise<Property> {
    await ensureSchemaVersion();
    const properties = await readArray<Property>(PROPERTIES_KEY);
    if (properties.length > 0) return properties[0];
    const property: Property = {
      id: generateId(),
      name: DEFAULT_PROPERTY_NAME,
      createdAt: Date.now(),
    };
    await AsyncStorage.setItem(PROPERTIES_KEY, JSON.stringify([property]));
    return property;
  }
}

/**
 * Concrete singletons, typed as the interfaces so screens import behavior, not
 * implementation. Swapping to Supabase later means changing only these two
 * bindings — the interface-typed UI never notices.
 */
export const mowRepository: MowRepository = new AsyncStorageMowRepository();
export const propertyRepository: PropertyRepository =
  new AsyncStoragePropertyRepository();
