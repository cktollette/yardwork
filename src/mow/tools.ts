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
