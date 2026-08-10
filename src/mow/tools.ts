/**
 * Pure logic for "tools used per mow": resolving a mow's equipmentIds against
 * the garage, deriving the tool types for the log card, and seeding a new mow's
 * selection from history. No UI, no persistence.
 *
 * Referential integrity (D-038): equipment is hard-deleted (D-027), so a mow's
 * equipmentIds may reference equipment that no longer exists. These helpers
 * TOLERATE dangling ids — resolution silently omits them and reports how many
 * were missing (so a caller like Mow Detail can note it) — and NEVER mutate the
 * input ids. Stored ids self-heal only through an explicit edit.
 */

import { EQUIPMENT_TYPES } from '../equipment/catalog';
import type { Equipment, EquipmentType } from '../equipment/models';

export interface ResolvedTools {
  /** The resolved equipment, in equipmentIds order; dangling ids omitted. */
  equipment: Equipment[];
  /** How many ids did not resolve to a piece of equipment. */
  missingCount: number;
}

function indexById(equipment: Equipment[]): Map<string, Equipment> {
  return new Map(equipment.map((e) => [e.id, e]));
}

/**
 * Resolve a mow's equipmentIds against the garage. Order-preserving; dangling
 * ids (equipment removed since the mow was logged) are omitted from `equipment`
 * and counted in `missingCount`.
 */
export function resolveMowTools(
  equipmentIds: string[] | undefined,
  equipment: Equipment[],
): ResolvedTools {
  if (!equipmentIds || equipmentIds.length === 0) {
    return { equipment: [], missingCount: 0 };
  }
  const byId = indexById(equipment);
  const resolved: Equipment[] = [];
  let missingCount = 0;
  for (const id of equipmentIds) {
    const found = byId.get(id);
    if (found) resolved.push(found);
    else missingCount++;
  }
  return { equipment: resolved, missingCount };
}

/**
 * The distinct tool types a mow used, in canonical EQUIPMENT_TYPES order, for
 * the compact card indicators. Dangling ids contribute no type (silently
 * omitted) since a removed tool carries no type to show.
 */
export function mowToolTypes(
  equipmentIds: string[] | undefined,
  equipment: Equipment[],
): EquipmentType[] {
  const { equipment: resolved } = resolveMowTools(equipmentIds, equipment);
  const present = new Set(resolved.map((e) => e.type));
  return EQUIPMENT_TYPES.map((t) => t.value).filter((t) => present.has(t));
}

/** The minimal shape the history helpers need from a mow. */
export interface ToolsMow {
  equipmentIds?: string[];
}

/**
 * The equipmentIds of the most recently logged mow that used any tools. Given a
 * newest-first list of mows (as the repository returns), returns the first
 * non-empty equipmentIds, or undefined when no mow used tools.
 */
export function mostRecentEquipmentIds(mows: ToolsMow[]): string[] | undefined {
  for (const mow of mows) {
    if (mow.equipmentIds && mow.equipmentIds.length > 0) {
      return mow.equipmentIds;
    }
  }
  return undefined;
}

/**
 * The tool selection to seed a new mow with: the most recent mow's tools,
 * filtered to equipment that STILL exists in the garage (you can't pre-select a
 * chip that isn't shown, and a since-deleted tool shouldn't come back). Returns
 * ids in the garage's order for stable display.
 */
export function seedToolSelection(
  mows: ToolsMow[],
  currentEquipment: Equipment[],
): string[] {
  const recent = mostRecentEquipmentIds(mows);
  if (!recent) return [];
  const recentSet = new Set(recent);
  return currentEquipment.filter((e) => recentSet.has(e.id)).map((e) => e.id);
}

/**
 * Normalize a list of equipmentIds for storage: dedupe, drop blanks, and treat
 * an empty result as "no tools" (undefined) so a mow never stores an empty
 * array. Preserves first-seen order.
 */
export function normalizeEquipmentIds(ids: string[] | undefined): string[] | undefined {
  if (!ids) return undefined;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    const trimmed = id.trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      out.push(trimmed);
    }
  }
  return out.length > 0 ? out : undefined;
}
