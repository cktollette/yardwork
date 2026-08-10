import type { Equipment, EquipmentEdit, NewEquipment } from './models';

/**
 * Persistence boundary for equipment (D-013).
 *
 * Screens depend on THIS interface only, never on a concrete implementation, so
 * the AsyncStorage impl can be swapped for Supabase in a later branch without
 * touching the UI — matching MowRepository / PropertyRepository.
 */
export interface EquipmentRepository {
  /** All equipment, newest first by createdAt. */
  list(): Promise<Equipment[]>;
  /** A single piece of equipment by id, or null if none exists. */
  getById(id: string): Promise<Equipment | null>;
  /**
   * Persist a new piece of equipment and return it with its assigned id,
   * createdAt, and (reserved) catalogId. The stored value is normalized.
   */
  add(input: NewEquipment): Promise<Equipment>;
  /**
   * Apply an edit and return the updated, normalized equipment. Rejects if `id`
   * is unknown — nothing is written in that case.
   */
  update(id: string, patch: EquipmentEdit): Promise<Equipment>;
  /**
   * Hard-delete a piece of equipment (no tombstone, D-027). Idempotent:
   * deleting an unknown or already-deleted id resolves without error.
   */
  delete(id: string): Promise<void>;
}
