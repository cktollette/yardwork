import type { Mow, NewMow, Property } from './models';

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
}

/** Persistence boundary for properties. See MowRepository for the swap rationale. */
export interface PropertyRepository {
  /**
   * Return the default Property, creating one named "My Lawn" if none exists.
   * Idempotent: repeated calls return the same Property.
   */
  getOrCreateDefault(): Promise<Property>;
}
