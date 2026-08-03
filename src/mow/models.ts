/**
 * Core persisted domain model.
 *
 * See Decision D-005: Property is the account primitive, not User. A User has
 * many Properties; each Property has many Mows. Every Mow MUST belong to a
 * Property — no orphan mows, ever.
 */

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
}

/** A mow before it has been persisted; the repository assigns the id. */
export type NewMow = Omit<Mow, 'id'>;
