import type { Position, Zone } from '../mow/models';
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

/**
 * Total lawn area in square feet — the sum of every zone's stored area. Empty
 * lawn (no zones) sums to 0. Each zone's areaSqFt was computed on write, so this
 * never recomputes geometry.
 */
export function totalAreaSqFt(zones: Zone[]): number {
  return zones.reduce((sum, zone) => sum + zone.areaSqFt, 0);
}

/**
 * All vertices across all zones, flattened into one list. Used to pick a single
 * weather point for the whole lawn: pooling every zone's vertices into the
 * vertex-average centroid puts the point in the middle of the traced area,
 * whichever zones exist. Empty lawn → empty list (caller falls back to device
 * location).
 */
export function poolZoneVertices(zones: Zone[]): Position[] {
  return zones.flatMap((zone) => zone.vertices);
}
