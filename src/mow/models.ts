/**
 * Core persisted domain model.
 *
 * See Decision D-005: Property is the account primitive, not User. A User has
 * many Properties; each Property has many Mows. Every Mow MUST belong to a
 * Property — no orphan mows, ever.
 */

import type { EquipmentType } from '../equipment/models';
import type { Weather } from '../weather/WeatherService';
import type { Activity } from '../activity/ActivityService';

/** A `[longitude, latitude]` coordinate pair, GeoJSON axis order. */
export type Position = [number, number];

/**
 * One named lawn zone — an independent polygon with its own denormalized area.
 * A lawn is a set of zones (front yard, back yard, …) whose areas sum to the
 * total. Replaces the old single `Property.boundary` (v8 restructure).
 */
export interface Zone {
  id: string;
  /** User-facing label ("Lawn", "Zone 2", …). Editable; not validated. */
  name: string;
  /**
   * Ordered, OPEN ring of vertices (the closing edge back to the first point is
   * implied, never stored). Same vertex format as the old boundary.
   */
  vertices: Position[];
  /**
   * Area in square feet, derived from `vertices`. Recomputed on every write and
   * stored; readers use this value and NEVER recompute from vertices.
   */
  areaSqFt: number;
  /**
   * Optional grass type (from the curated GRASS_TYPES list, "Other" included).
   * Absent means "not set". Never required, never prompted. Reserved as the
   * future input to GDD cadence recommendations — nothing computes from it yet.
   */
  grassType?: string;
}

/** A place that gets mowed. A Property has a set of lawn zones (D-005). */
export interface Property {
  id: string;
  name: string;
  /** epoch ms when the Property was created */
  createdAt: number;
  /**
   * The lawn as a set of named zones. Total lawn area is the sum of zone areas.
   * Empty means no lawn has been traced yet. Migrated from the old single
   * `boundary` at v8: the old polygon becomes a single "Lawn" zone.
   */
  zones: Zone[];
}

/** A completed, persisted mow. Always tied to exactly one Property (D-005). */
export interface Mow {
  id: string;
  propertyId: string;
  /** epoch ms when the mow started */
  startedAt: number;
  /** epoch ms when the mow ended */
  endedAt: number;
  /** whole seconds elapsed */
  durationSeconds: number;
  /** optional free-form note typed on the Save Mow screen */
  notes?: string;
  /**
   * Optional height of cut, in inches (e.g. 2.5). Absent means "not set" — the
   * field is skippable on save and never blocks it. Constrained to the
   * 0.5"–4.5" range in 0.25" steps by the input; see src/mow/hoc.ts.
   */
  hocInches?: number;
  /**
   * Job types performed on this mow (mow / trim / edge / blow). Absent/empty
   * means none. These are plain enum VALUES, not references to Equipment
   * entities (D-037): job history records what was done and is deliberately
   * independent of the garage, so deleting equipment never affects it. Reuses
   * the EquipmentType union purely as the shared job vocabulary. See
   * src/mow/tools.ts.
   */
  toolTypes?: EquipmentType[];
  /**
   * Weather captured once at save time (capture-only provenance, D-040). Written
   * exactly once by the best-effort capture path (see captureWeatherForMow) and
   * NEVER edited, backfilled, or cleared afterwards. Absent means capture didn't
   * run or found no reading — the save never waits on or fails for weather.
   */
  weather?: Weather;
  /**
   * Steps + walking/running distance for the mow's timer window, captured once
   * at save time (capture-only provenance, D-042). Written exactly once by the
   * best-effort capture path (see captureActivityForMow) and NEVER edited,
   * backfilled, or cleared afterwards. Absent means capture didn't run, the
   * window was too short, or HealthKit had nothing — the save never waits on it.
   */
  activity?: Activity;
  /**
   * RESERVED (D-036): which lawn zones this mow covered. Declared now so the
   * persisted shape is forward-compatible, but NO code path in this PR ever
   * writes or reads it — per-mow zone selection is a future feature. Absent on
   * every mow today; enforced by a test that greps the source for the field.
   */
  zoneIds?: string[];
}

/**
 * A mow before it has been persisted; the repository assigns the id. `weather`
 * and `activity` are omitted (provenance attached only by their capture paths);
 * `zoneIds` is omitted too — it's a reserved field never set at save time.
 */
export type NewMow = Omit<Mow, 'id' | 'weather' | 'activity' | 'zoneIds'>;
