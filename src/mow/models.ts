/**
 * Core persisted domain model.
 *
 * See Decision D-005: Property is the account primitive, not User. A User has
 * many Properties; each Property has many Mows. Every Mow MUST belong to a
 * Property — no orphan mows, ever.
 */

import type { EquipmentType } from '../equipment/models';

/** A `[longitude, latitude]` coordinate pair, GeoJSON axis order. */
export type Position = [number, number];

/** A place that gets mowed. A Property has at most one lawn polygon (D-005). */
export interface Property {
  id: string;
  name: string;
  /** epoch ms when the Property was created */
  createdAt: number;
  /**
   * The lawn boundary as an ordered, OPEN ring of vertices (the closing edge
   * back to the first point is implied, never stored). `null`/absent means no
   * polygon has been drawn yet. One polygon per property — saving replaces it.
   */
  boundary?: Position[] | null;
  /**
   * Lawn area in square feet, derived from `boundary`. Recomputed on every
   * write and stored; readers use this value and NEVER recompute from boundary.
   * `null`/absent whenever `boundary` is.
   */
  areaSqFt?: number | null;
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
}

/** A mow before it has been persisted; the repository assigns the id. */
export type NewMow = Omit<Mow, 'id'>;
