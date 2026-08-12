import { MIGRATED_ZONE_NAME } from './migrateProperty';

/**
 * Pure helpers over a lawn's set of zones.
 */

/**
 * Default name for a newly added zone given how many zones already exist.
 * The first zone is "Lawn" (matching the migrated single-polygon name); every
 * one after that is "Zone 2", "Zone 3", … Names are freely editable later.
 */
export function defaultZoneName(existingCount: number): string {
  return existingCount === 0 ? MIGRATED_ZONE_NAME : `Zone ${existingCount + 1}`;
}
