import type { Position, Property, Zone } from '../mow/models';
import { MIN_BOUNDARY_VERTICES } from '../mow/repositories';
import { computeAreaSqFt } from './area';

/**
 * Deterministic id for the single zone produced when migrating a v7 lawn. Fixed
 * (not generateId()) so the migrate-on-read transform is stable and idempotent:
 * a v7 record re-derives the SAME zone id on every read until the first write
 * persists the v8 shape. New zones use generateId(); it never collides with this.
 */
export const MIGRATED_ZONE_ID = 'lawn';

/** The default name for the migrated (and the very first) lawn zone. */
export const MIGRATED_ZONE_NAME = 'Lawn';

/** Shape of a raw stored property, which may be v7 (boundary) or v8 (zones). */
type RawProperty = {
  id: string;
  name: string;
  createdAt: number;
  zones?: Zone[];
  boundary?: Position[] | null;
  areaSqFt?: number | null;
};

/**
 * Normalize a raw persisted property to the v8 `zones` shape. Idempotent — runs
 * on every property read (the schema-versioned load path), so re-running on
 * already-migrated data must be a no-op:
 *   - already has `zones` → returned as-is (any stray legacy fields dropped);
 *   - v7 `boundary` with >= 3 vertices → a single "Lawn" zone with IDENTICAL
 *     vertices and area (the stored areaSqFt is reused so existing users' numbers
 *     don't move; it's only recomputed if somehow absent);
 *   - no polygon → `zones: []`.
 */
export function migrateProperty(raw: RawProperty): Property {
  const base = { id: raw.id, name: raw.name, createdAt: raw.createdAt };

  if (Array.isArray(raw.zones)) {
    // Already v8. Reconstruct a clean object so no legacy boundary/areaSqFt
    // fields ride along.
    return { ...base, zones: raw.zones };
  }

  if (raw.boundary && raw.boundary.length >= MIN_BOUNDARY_VERTICES) {
    const areaSqFt =
      typeof raw.areaSqFt === 'number' ? raw.areaSqFt : computeAreaSqFt(raw.boundary);
    const zone: Zone = {
      id: MIGRATED_ZONE_ID,
      name: MIGRATED_ZONE_NAME,
      vertices: raw.boundary,
      areaSqFt,
    };
    return { ...base, zones: [zone] };
  }

  return { ...base, zones: [] };
}
