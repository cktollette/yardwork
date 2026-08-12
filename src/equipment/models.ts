/**
 * Equipment domain model — the user's garage of mowers and handheld tools.
 *
 * A standalone entity in its own collection (D-034): equipment is NOT linked to
 * the Mow model yet. The tools-per-mow feature (a later PR) will reference these
 * entities by id. Persisted via the EquipmentRepository interface (D-013).
 */

export type EquipmentType = 'mower' | 'trimmer' | 'edger' | 'blower';
export type PowerSource = 'gas' | 'battery' | 'corded' | 'manual';
export type DriveType = 'push' | 'self_propelled' | 'ride' | 'zero_turn';

/** A piece of lawn equipment the user owns. */
export interface Equipment {
  id: string;
  type: EquipmentType;
  brand: string;
  /**
   * Model name/number. OPTIONAL (v9): requiring it at entry created onboarding
   * friction — testers often don't have a model number handy. Absent/blank means
   * "not provided"; display falls back to brand alone.
   */
  model?: string;
  /** Optional friendly name; falls back to brand (+ model when present). */
  nickname?: string;
  powerSource: PowerSource;
  /**
   * Drive type applies to mowers only (D-035). Normalization clears it whenever
   * `type !== 'mower'`, so a non-mower never carries a stale drive type.
   */
  driveType?: DriveType;
  /**
   * Reserved for a future equipment catalog (matching a user's entry to a known
   * make/model). Unused for now — always `null` on add; no reads depend on it.
   */
  catalogId?: string | null;
  /** epoch ms when the equipment was added; repo-assigned. */
  createdAt: number;
}

/** Equipment before it is persisted; the repository assigns id/createdAt/catalogId. */
export type NewEquipment = Omit<Equipment, 'id' | 'createdAt' | 'catalogId'>;

/**
 * The editable slice of a piece of equipment. Only keys present in a patch are
 * applied; `nickname`/`driveType` clear when their value is blank/undefined.
 * `id`, `createdAt`, and the reserved `catalogId` are not editable.
 */
export interface EquipmentEdit {
  type?: EquipmentType;
  brand?: string;
  model?: string;
  /** Blank/whitespace clears the nickname. Omit the key to leave it as-is. */
  nickname?: string;
  powerSource?: PowerSource;
  /** Undefined clears the drive type. Also cleared when type is not a mower. */
  driveType?: DriveType;
}
