import type { MowEdit } from './editMow';
import type { Mow, NewMow, Position, Property } from './models';
import type { Weather } from '../weather/WeatherService';
import type { Activity } from '../activity/ActivityService';

/**
 * Persistence boundary for mows.
 *
 * Screens depend on THIS interface only, never on a concrete implementation,
 * so the AsyncStorage impl can be swapped for Supabase in a later branch
 * without touching the UI.
 */
export interface MowRepository {
  /**
   * Persist a new mow and return it with its assigned id.
   * Rejects if `propertyId` is missing/empty — no orphan mows, ever (D-005).
   */
  saveMow(input: NewMow): Promise<Mow>;
  /** All mows, reverse-chronological by startedAt (newest first). */
  listMows(): Promise<Mow[]>;
  /** A single mow by id, or null if none exists. */
  getMowById(id: string): Promise<Mow | null>;
  /**
   * Apply an edit to a mow and return the updated mow. Rejects if `id` is
   * unknown, or if the patch would make the mow end at/before it starts — in
   * which case nothing is written (see applyMowEdit).
   */
  update(id: string, patch: MowEdit): Promise<Mow>;
  /**
   * Hard-delete a mow (no tombstone). Idempotent: deleting an unknown or
   * already-deleted id resolves without error.
   */
  delete(id: string): Promise<void>;
  /**
   * Attach captured weather to a mow, setting only the `weather` field and
   * leaving everything else untouched. Capture-only provenance (D-040): weather
   * is written here once and never via update(). Silent no-op on an unknown id
   * (same idempotent contract as delete, D-027).
   */
  attachWeather(id: string, weather: Weather): Promise<void>;
  /**
   * Attach captured activity to a mow, setting only the `activity` field and
   * leaving everything else untouched. Capture-only provenance (D-042): activity
   * is written here once and never via update(). Silent no-op on an unknown id
   * (same idempotent contract as delete, D-027).
   */
  attachActivity(id: string, activity: Activity): Promise<void>;
}

/** The fewest vertices that form a polygon. Enforced on every zone write. */
export const MIN_BOUNDARY_VERTICES = 3;

/**
 * A zone edit: rename, re-trace, set/clear grass type, or any combination.
 * Omitted keys are left unchanged. For `grassType`, a present key with an empty
 * or undefined value CLEARS it (present-but-undefined pattern); omit the key to
 * leave it as-is.
 */
export interface ZoneEdit {
  name?: string;
  vertices?: Position[];
  grassType?: string;
}

/**
 * Patch for a Property's user-disclosed location (v15). Every key follows the
 * present-but-undefined pattern: a present key with a truthy value SETS it, a
 * present key with `undefined` CLEARS it, an omitted key leaves it unchanged.
 * Callers pass a normalized patch (empty/whitespace already collapsed to
 * `undefined`; country/zone already validated against their bundled lists).
 */
export interface PropertyLocationEdit {
  locationCity?: string;
  locationRegion?: string;
  locationCountry?: string;
  hardinessZone?: string;
}

/** Persistence boundary for properties. See MowRepository for the swap rationale. */
export interface PropertyRepository {
  /**
   * Return the default Property, creating one named "My Lawn" (with no zones) if
   * none exists. Idempotent: repeated calls return the same Property.
   */
  getOrCreateDefault(): Promise<Property>;
  /** A single Property by id, or null if none exists. */
  getById(id: string): Promise<Property | null>;
  /**
   * Add a new lawn zone. The area is computed from `vertices` and stored on the
   * zone; the name defaults ("Lawn" for the first zone, "Zone N" after) when
   * omitted. Rejects if the Property doesn't exist, or if `vertices` has fewer
   * than MIN_BOUNDARY_VERTICES points. Returns the updated Property.
   */
  addZone(
    propertyId: string,
    input: { name?: string; vertices: Position[] },
  ): Promise<Property>;
  /**
   * Edit a zone's name and/or vertices. When vertices change, the zone's area is
   * recomputed and stored. Rejects if the Property doesn't exist, the zone id is
   * unknown, or new `vertices` (when present) have fewer than
   * MIN_BOUNDARY_VERTICES points. Returns the updated Property.
   */
  updateZone(propertyId: string, zoneId: string, patch: ZoneEdit): Promise<Property>;
  /**
   * Remove a zone from a Property, returning the updated Property. Idempotent:
   * a no-op (no error) when the zone id doesn't exist. Removing the last zone
   * leaves a valid empty lawn (`zones: []`).
   */
  deleteZone(propertyId: string, zoneId: string): Promise<Property>;
  /**
   * Set/clear the Property's disclosed location fields (v15). Serialized through
   * the same write-queue as zone edits (D-052). Rejects if the Property doesn't
   * exist. Returns the updated Property.
   */
  updateLocation(propertyId: string, patch: PropertyLocationEdit): Promise<Property>;
}
