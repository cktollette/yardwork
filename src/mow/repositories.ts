import type { MowEdit } from './editMow';
import type { Mow, NewMow, Position, Property } from './models';

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
}

/** The fewest vertices that form a polygon. Enforced on write; see saveBoundary. */
export const MIN_BOUNDARY_VERTICES = 3;

/** Persistence boundary for properties. See MowRepository for the swap rationale. */
export interface PropertyRepository {
  /**
   * Return the default Property, creating one named "My Lawn" if none exists.
   * Idempotent: repeated calls return the same Property.
   */
  getOrCreateDefault(): Promise<Property>;
  /** A single Property by id, or null if none exists. */
  getById(id: string): Promise<Property | null>;
  /**
   * Persist the lawn boundary for a Property, replacing any existing polygon
   * (one polygon per property, D-005). The area is recomputed from `boundary`
   * and stored alongside it — callers read the stored area, never recompute.
   *
   * Rejects if the Property doesn't exist, or if `boundary` has fewer than
   * MIN_BOUNDARY_VERTICES points (not a polygon). Returns the updated Property.
   */
  saveBoundary(propertyId: string, boundary: Position[]): Promise<Property>;
  /**
   * Remove the lawn boundary (and its stored area) from a Property, returning
   * the updated Property. A no-op on a Property that has no polygon.
   */
  clearBoundary(propertyId: string): Promise<Property>;
}
