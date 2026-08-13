import AsyncStorage from '@react-native-async-storage/async-storage';
import { computeAreaSqFt } from '../lawn/area';
import { migrateProperty } from '../lawn/migrateProperty';
import { defaultZoneName } from '../lawn/zones';
import { applyMowEdit } from './editMow';
import type { MowEdit } from './editMow';
import { generateId } from './id';
import type { Mow, NewMow, Position, Property, Zone } from './models';
import {
  MIN_BOUNDARY_VERTICES,
  type MowRepository,
  type PropertyRepository,
  type ZoneEdit,
} from './repositories';
import { ensureSchemaVersion } from '../storage/schema';
import { photoStore } from '../photos';
import type { Weather } from '../weather/WeatherService';
import type { Activity } from '../activity/ActivityService';

export const MOWS_KEY = '@yardwork/mows';
export const PROPERTIES_KEY = '@yardwork/properties';

/** Name of the Property auto-created on the first mow save (D-005). */
export const DEFAULT_PROPERTY_NAME = 'My Lawn';

/**
 * Read + JSON-parse an array-valued key, returning [] on missing or corrupt
 * data. Never throws — a bad value must not crash the app; it reads as "empty",
 * matching the defensive style of loadRunningTimer().
 *
 * Also drops any null/non-object ELEMENTS. Callers dereference every record
 * (migrateProperty reads `.id`, the repos `.find(e => e.id === id)`), so a
 * single malformed element would otherwise throw and — via an un-caught startup
 * load — hang the app on a blank first screen. Element validation keeps the
 * "bad value reads as empty" contract at the element level, not just the array.
 */
async function readArray<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((el) => el != null && typeof el === 'object') as T[];
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
      // Screens pass picker TEMP URIs; copy them into app-owned storage first so
      // the persisted record points at durable files (D-057). The repository is
      // the single choke point for photo file I/O — no screen touches the store.
      const { beforePhotoUri: rawBefore, afterPhotoUri: rawAfter, ...rest } = input;
      const beforePhotoUri = rawBefore ? await photoStore.copyIntoStore(rawBefore) : undefined;
      const afterPhotoUri = rawAfter ? await photoStore.copyIntoStore(rawAfter) : undefined;
      const mow: Mow = {
        ...rest,
        id: generateId(),
        ...(beforePhotoUri ? { beforePhotoUri } : {}),
        ...(afterPhotoUri ? { afterPhotoUri } : {}),
      };
      const mows = await readArray<Mow>(MOWS_KEY);
      mows.push(mow);
      try {
        await AsyncStorage.setItem(MOWS_KEY, JSON.stringify(mows));
      } catch (err) {
        // Orphan-safety: the record didn't persist, so drop the files we copied.
        await photoStore.deleteFile(beforePhotoUri);
        await photoStore.deleteFile(afterPhotoUri);
        throw err;
      }
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
      const existing = mows[index];
      // Resolve any picker temp URI in the patch to an app URI (copy into the
      // store) BEFORE applying, so the persisted record points at a durable file.
      // A present-undefined stays a clear; an omitted slot stays omitted.
      const effectivePatch: MowEdit = { ...patch };
      const copied: string[] = []; // freshly-copied files, for cleanup on failure
      if ('beforePhotoUri' in patch) {
        effectivePatch.beforePhotoUri = patch.beforePhotoUri
          ? await photoStore.copyIntoStore(patch.beforePhotoUri)
          : undefined;
        if (effectivePatch.beforePhotoUri) copied.push(effectivePatch.beforePhotoUri);
      }
      if ('afterPhotoUri' in patch) {
        effectivePatch.afterPhotoUri = patch.afterPhotoUri
          ? await photoStore.copyIntoStore(patch.afterPhotoUri)
          : undefined;
        if (effectivePatch.afterPhotoUri) copied.push(effectivePatch.afterPhotoUri);
      }
      // applyMowEdit validates before we write, so a rejected edit (e.g. a
      // non-positive duration) leaves stored data untouched.
      const updated = applyMowEdit(existing, effectivePatch);
      // Weather is capture-only provenance (D-040): an edit can never clear or
      // change it, regardless of what the caller passes. Carry the stored value
      // through verbatim.
      const existingWeather = mows[index].weather;
      if (existingWeather !== undefined) {
        updated.weather = existingWeather;
      } else {
        delete updated.weather;
      }
      // Activity is capture-only provenance too (D-042): same verbatim carry, so
      // an edit — even one whose payload contains `activity: undefined` — can
      // never clear or change it.
      const existingActivity = mows[index].activity;
      if (existingActivity !== undefined) {
        updated.activity = existingActivity;
      } else {
        delete updated.activity;
      }
      mows[index] = updated;
      try {
        await AsyncStorage.setItem(MOWS_KEY, JSON.stringify(mows));
      } catch (err) {
        // Record didn't persist → drop the copies we made (the OLD files stay
        // referenced by the unchanged record, so we must not touch them).
        for (const uri of copied) await photoStore.deleteFile(uri);
        throw err;
      }
      // Record is durable → delete each SUPERSEDED old file: a slot that was in
      // the patch and moved away from a non-null old URI (replace or clear).
      // Never delete a file the persisted record still points at.
      if (
        'beforePhotoUri' in patch &&
        existing.beforePhotoUri &&
        existing.beforePhotoUri !== updated.beforePhotoUri
      ) {
        await photoStore.deleteFile(existing.beforePhotoUri);
      }
      if (
        'afterPhotoUri' in patch &&
        existing.afterPhotoUri &&
        existing.afterPhotoUri !== updated.afterPhotoUri
      ) {
        await photoStore.deleteFile(existing.afterPhotoUri);
      }
      return updated;
    });
  }

  async delete(id: string): Promise<void> {
    return this.enqueue(async () => {
      await ensureSchemaVersion();
      const mows = await readArray<Mow>(MOWS_KEY);
      const target = mows.find((m) => m.id === id);
      const remaining = mows.filter((m) => m.id !== id);
      // Idempotent: only act when something actually changed.
      if (remaining.length !== mows.length) {
        // Delete the photo files BEFORE removing the record, so if a file delete
        // throws the record survives for a retried delete to re-clean — no
        // orphan. deleteFile is itself idempotent on a missing file (D-027); we
        // only call it for slots that actually hold a URI.
        if (target?.beforePhotoUri) await photoStore.deleteFile(target.beforePhotoUri);
        if (target?.afterPhotoUri) await photoStore.deleteFile(target.afterPhotoUri);
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
      if (index === -1) {
        if (__DEV__) console.warn(`[weather] attachWeather no-op: no mow with id ${id}`);
        return;
      }
      // Set only the weather field; leave every other field as stored.
      mows[index] = { ...mows[index], weather };
      await AsyncStorage.setItem(MOWS_KEY, JSON.stringify(mows));
    });
  }

  async attachActivity(id: string, activity: Activity): Promise<void> {
    return this.enqueue(async () => {
      await ensureSchemaVersion();
      const mows = await readArray<Mow>(MOWS_KEY);
      const index = mows.findIndex((m) => m.id === id);
      // Silent no-op on a gone record (D-027 idempotent pattern) — the mow may
      // have been deleted between save and this best-effort capture.
      if (index === -1) return;
      // Set only the activity field; leave every other field as stored.
      mows[index] = { ...mows[index], activity };
      await AsyncStorage.setItem(MOWS_KEY, JSON.stringify(mows));
    });
  }
}

class AsyncStoragePropertyRepository implements PropertyRepository {
  /**
   * Serialize mutations so concurrent zone writes can't lose updates — the same
   * promise-chain mutex the mow repo uses. The property repo previously had
   * none, which was fine for one boundary but is a lost-update risk now that a
   * lawn holds multiple independently-edited zones.
   */
  private mutations: Promise<unknown> = Promise.resolve();

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.mutations.then(task, task);
    this.mutations = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  /**
   * Read all properties, each normalized to the current v8 `zones` shape via
   * migrateProperty. This is the schema-versioned load path: idempotent, so v7
   * single-boundary records are transformed in memory on every read until the
   * next write persists the v8 shape.
   */
  private async loadProperties(): Promise<Property[]> {
    await ensureSchemaVersion();
    const raw = await readArray<Property>(PROPERTIES_KEY);
    return raw.map(migrateProperty);
  }

  async getOrCreateDefault(): Promise<Property> {
    return this.enqueue(async () => {
      const properties = await this.loadProperties();
      if (properties.length > 0) return properties[0];
      const property: Property = {
        id: generateId(),
        name: DEFAULT_PROPERTY_NAME,
        createdAt: Date.now(),
        zones: [],
      };
      await AsyncStorage.setItem(PROPERTIES_KEY, JSON.stringify([property]));
      return property;
    });
  }

  async getById(id: string): Promise<Property | null> {
    const properties = await this.loadProperties();
    return properties.find((p) => p.id === id) ?? null;
  }

  async addZone(
    propertyId: string,
    input: { name?: string; vertices: Position[] },
  ): Promise<Property> {
    // Not a polygon below the minimum — reject before any write.
    if (input.vertices.length < MIN_BOUNDARY_VERTICES) {
      throw new Error(`A lawn zone needs at least ${MIN_BOUNDARY_VERTICES} vertices`);
    }
    return this.updateProperty(propertyId, (p) => {
      const zone: Zone = {
        id: generateId(),
        name: input.name ?? defaultZoneName(p.zones.length),
        vertices: input.vertices,
        // Recompute area on write and store it; readers never recompute.
        areaSqFt: computeAreaSqFt(input.vertices),
      };
      return { ...p, zones: [...p.zones, zone] };
    });
  }

  async updateZone(
    propertyId: string,
    zoneId: string,
    patch: ZoneEdit,
  ): Promise<Property> {
    if (patch.vertices && patch.vertices.length < MIN_BOUNDARY_VERTICES) {
      throw new Error(`A lawn zone needs at least ${MIN_BOUNDARY_VERTICES} vertices`);
    }
    return this.updateProperty(propertyId, (p) => {
      const index = p.zones.findIndex((z) => z.id === zoneId);
      if (index === -1) {
        throw new Error(`No zone with id ${zoneId}`);
      }
      const current = p.zones[index];
      const updated: Zone = {
        ...current,
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.vertices !== undefined
          ? { vertices: patch.vertices, areaSqFt: computeAreaSqFt(patch.vertices) }
          : {}),
      };
      // Grass type: present key sets a value or clears (empty/undefined); an
      // omitted key leaves it unchanged.
      if ('grassType' in patch) {
        if (patch.grassType) updated.grassType = patch.grassType;
        else delete updated.grassType;
      }
      const zones = [...p.zones];
      zones[index] = updated;
      return { ...p, zones };
    });
  }

  async deleteZone(propertyId: string, zoneId: string): Promise<Property> {
    // Idempotent: filtering a missing id is a harmless no-op. Removing the last
    // zone leaves zones: [] — a valid empty lawn.
    return this.updateProperty(propertyId, (p) => ({
      ...p,
      zones: p.zones.filter((z) => z.id !== zoneId),
    }));
  }

  /**
   * Serialized load-modify-write of one property. Reads the migrated list,
   * applies `mutate` to the matching property, writes back. Throws if `id` is
   * unknown — a zone can't hang off a property that doesn't exist (D-005).
   */
  private updateProperty(
    id: string,
    mutate: (p: Property) => Property,
  ): Promise<Property> {
    return this.enqueue(async () => {
      const properties = await this.loadProperties();
      const index = properties.findIndex((p) => p.id === id);
      if (index === -1) {
        throw new Error(`No property with id ${id}`);
      }
      const updated = mutate(properties[index]);
      properties[index] = updated;
      await AsyncStorage.setItem(PROPERTIES_KEY, JSON.stringify(properties));
      return updated;
    });
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
