/**
 * Core persisted domain model.
 *
 * See Decision D-005: Property is the account primitive, not User. A User has
 * many Properties; each Property has many Mows. Every Mow MUST belong to a
 * Property — no orphan mows, ever.
 */

/** A place that gets mowed. (No polygon yet — a later branch enriches this.) */
export interface Property {
  id: string;
  name: string;
  /** epoch ms when the Property was created */
  createdAt: number;
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
