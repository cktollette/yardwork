/**
 * Pure logic for the job types performed on a mow (mow / trim / edge / blow).
 * No UI, no persistence, and — by design (D-037) — no dependency on the garage:
 * a mow stores plain EquipmentType enum values, so job history is immune to
 * equipment deletion. We reuse EquipmentType only as the shared job vocabulary.
 */

import { EQUIPMENT_TYPES } from '../equipment/catalog';
import type { EquipmentType } from '../equipment/models';

/** Canonical job-type order (mower, trimmer, edger, blower). */
const TYPE_ORDER: EquipmentType[] = EQUIPMENT_TYPES.map((t) => t.value);

/**
 * Normalize job types for storage: dedupe, force canonical order, drop any value
 * that isn't a known type, and treat an empty result as "none" (undefined) so a
 * mow never stores an empty array.
 */
export function normalizeToolTypes(
  types: EquipmentType[] | undefined,
): EquipmentType[] | undefined {
  if (!types) return undefined;
  const set = new Set(types);
  const ordered = TYPE_ORDER.filter((t) => set.has(t));
  return ordered.length > 0 ? ordered : undefined;
}

/** The minimal shape the history helper needs from a mow. */
export interface ToolsMow {
  toolTypes?: EquipmentType[];
}

/**
 * The job types of the most recently logged mow that recorded any. Given a
 * newest-first list of mows (as the repository returns), returns the first
 * non-empty `toolTypes`, or undefined when no mow recorded tools — used to seed
 * a new mow's selection (progressive disclosure, like HOC).
 */
export function mostRecentToolTypes(mows: ToolsMow[]): EquipmentType[] | undefined {
  for (const mow of mows) {
    if (mow.toolTypes && mow.toolTypes.length > 0) {
      return mow.toolTypes;
    }
  }
  return undefined;
}

/** A job type paired with the number of mows that recorded it. */
export interface ToolUsage {
  type: EquipmentType;
  count: number;
}

/**
 * Rank job types by how many mows recorded each, most-used first. Each mow
 * counts once per type (toolTypes are already deduped by normalizeToolTypes).
 * Mows with no toolTypes contribute nothing; a log with no recorded tools yields
 * []. Ties break by canonical EQUIPMENT_TYPES order (mower, trimmer, edger,
 * blower): the array is seeded in canonical order and sorted by count with a
 * stable sort, so equal counts keep canonical order. Unknown values (shouldn't
 * occur post-normalize) are dropped, since only canonical types are emitted.
 */
export function rankToolUsage(mows: ToolsMow[]): ToolUsage[] {
  const counts = new Map<EquipmentType, number>();
  for (const mow of mows) {
    if (!mow.toolTypes) continue;
    for (const type of mow.toolTypes) {
      counts.set(type, (counts.get(type) ?? 0) + 1);
    }
  }
  return TYPE_ORDER.map((type) => ({ type, count: counts.get(type) ?? 0 }))
    .filter((usage) => usage.count > 0)
    .sort((a, b) => b.count - a.count);
}
