import AsyncStorage from '@react-native-async-storage/async-storage';
import { computeAreaSqFt } from '../lawn/area';
import { applyMowEdit } from './editMow';
import type { MowEdit } from './editMow';
import { generateId } from './id';
import type { Mow, NewMow, Position, Property } from './models';
import {
  MIN_BOUNDARY_VERTICES,
  type MowRepository,
  type PropertyRepository,
} from './repositories';
import { ensureSchemaVersion } from '../storage/schema';
import type { Weather } from '../weather/WeatherService';

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
  /**
   * Serializes every mutation (save/update/delete/attachWeather) through a
   * single promise chain, so each one reads a snapshot that already reflects all
   * prior mutations. Without this, the whole-array read-modify-write pattern is
   * lost-update-prone: two overlapping mutations read the same snapshot and the
   * second write clobbers the first (e.g. a user edit racing weather capture).
   * Reads are not enqueued — they don't write, so they can't clobber.
   */
  private mutations: Promise<unknown> = Promise.resolve();

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    // Run after the previous mutation settles (either outcome), so an earlier
    // failure never wedges the queue.
    const run = this.mutations.then(task, task);
    // Keep the chain alive and swallow settled results so a rejected mutation
    // doesn't surface as an unhandled rejection on the internal chain — the
    // caller still sees the real outcome through `run`.
    this.mutations = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async saveMow(input: NewMow): Promise<Mow> {
    // No orphan mows, ever (D-005). Checked before any write, so a rejected
    // save persists nothing.
    if (!input.propertyId) {
      throw new Error('Cannot save a mow without a propertyId');
    }
    return this.enqueue(async () => {
      await ensureSchemaVersion();
      const mow: Mow = { ...input, id: generateId() };
      const mows = await readArray<Mow>(MOWS_KEY);
      mows.push(mow);
      await AsyncStorage.setItem(MOWS_KEY, JSON.stringify(mows));
      return mow;
    });
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

  async update(id: string, patch: MowEdit): Promise<Mow> {
    return this.enqueue(async () => {
      await ensureSchemaVersion();
      const mows = await readArray<Mow>(MOWS_KEY);
      const index = mows.findIndex((m) => m.id === id);
      if (index === -1) {
        throw new Error(`No mow with id ${id}`);
      }
      // applyMowEdit validates before we write, so a rejected edit (e.g. a
      // non-positive duration) leaves stored data untouched.
      const updated = applyMowEdit(mows[index], patch);
      // Weather is capture-only provenance (D-040): an edit can never clear or
      // change it, regardless of what the caller passes. Carry the stored value
      // through verbatim.
      const existingWeather = mows[index].weather;
      if (existingWeather !== undefined) {
        updated.weather = existingWeather;
      } else {
        delete updated.weather;
      }
      mows[index] = updated;
      await AsyncStorage.setItem(MOWS_KEY, JSON.stringify(mows));
      return updated;
    });
  }

  async delete(id: string): Promise<void> {
    return this.enqueue(async () => {
      await ensureSchemaVersion();
      const mows = await readArray<Mow>(MOWS_KEY);
      const remaining = mows.filter((m) => m.id !== id);
      // Idempotent: only write when something actually changed.
      if (remaining.length !== mows.length) {
        await AsyncStorage.setItem(MOWS_KEY, JSON.stringify(remaining));
      }
    });
  }

  async attachWeather(id: string, weather: Weather): Promise<void> {
    return this.enqueue(async () => {
      await ensureSchemaVersion();
      const mows = await readArray<Mow>(MOWS_KEY);
      const index = mows.findIndex((m) => m.id === id);
      // Silent no-op on a gone record (D-027 idempotent pattern) — the mow may
      // have been deleted between save and this best-effort capture.
      if (index === -1) return;
      // Set only the weather field; leave every other field as stored.
      mows[index] = { ...mows[index], weather };
      await AsyncStorage.setItem(MOWS_KEY, JSON.stringify(mows));
    });
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

  async getById(id: string): Promise<Property | null> {
    await ensureSchemaVersion();
    const properties = await readArray<Property>(PROPERTIES_KEY);
    return properties.find((p) => p.id === id) ?? null;
  }

  async saveBoundary(propertyId: string, boundary: Position[]): Promise<Property> {
    // Not a polygon below the minimum — reject before any write so a bad call
    // leaves stored data untouched.
    if (boundary.length < MIN_BOUNDARY_VERTICES) {
      throw new Error(
        `A lawn boundary needs at least ${MIN_BOUNDARY_VERTICES} vertices`,
      );
    }
    // Recompute area on write and store it (D-005: read the stored number,
    // never recompute from boundary).
    const areaSqFt = computeAreaSqFt(boundary);
    return this.updateProperty(propertyId, (p) => ({ ...p, boundary, areaSqFt }));
  }

  async clearBoundary(propertyId: string): Promise<Property> {
    return this.updateProperty(propertyId, (p) => ({
      ...p,
      boundary: null,
      areaSqFt: null,
    }));
  }

  /**
   * Load the property list, replace the one matching `id` via `mutate`, write
   * the list back, and return the updated Property. Throws if `id` is unknown —
   * a boundary can't hang off a property that doesn't exist (D-005).
   */
  private async updateProperty(
    id: string,
    mutate: (p: Property) => Property,
  ): Promise<Property> {
    await ensureSchemaVersion();
    const properties = await readArray<Property>(PROPERTIES_KEY);
    const index = properties.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error(`No property with id ${id}`);
    }
    const updated = mutate(properties[index]);
    properties[index] = updated;
    await AsyncStorage.setItem(PROPERTIES_KEY, JSON.stringify(properties));
    return updated;
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
