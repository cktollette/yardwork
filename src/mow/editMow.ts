import type { EquipmentType } from '../equipment/models';
import { clampBags } from './bags';
import { clampHoc } from './hoc';
import type { Mow } from './models';
import { normalizeToolTypes } from './tools';

/**
 * The editable slice of a mow (D-014: timestamps stay the source of truth).
 * Only the keys present in a patch are applied:
 *  - `startedAt` alone shifts `endedAt` to preserve the existing duration;
 *  - `durationSeconds` alone recomputes `endedAt` from the existing start;
 *  - `notes` sets the note, or clears it when blank/whitespace-only.
 *  - `hocInches` sets the height of cut (clamped/snapped), or clears it when
 *    the patch value is `undefined`.
 *  - `clippingBags` sets the bag count (clamped/rounded), or clears it when the
 *    patch value is `undefined`. A patch value of `0` sets zero, not clears.
 *  - `toolTypes` sets the job types performed (deduped/ordered), or clears them
 *    when the patch value is empty/undefined.
 * Nothing else about a mow is editable.
 */
export interface MowEdit {
  /** New start (epoch ms). */
  startedAt?: number;
  /** New duration (whole seconds). */
  durationSeconds?: number;
  /** New note; blank/whitespace clears it. Omit the key to leave notes as-is. */
  notes?: string;
  /**
   * New height of cut (inches); clamped/snapped to the valid grid. An explicit
   * `undefined` clears it. Omit the key to leave the HOC as-is.
   */
  hocInches?: number;
  /**
   * New clippings-bag count; clamped/rounded to the valid range. An explicit
   * `undefined` clears it; `0` is a set value, not a clear. Omit the key to
   * leave the bag count as-is.
   */
  clippingBags?: number;
  /**
   * New job types performed; deduped and canonically ordered. An empty array or
   * `undefined` clears them. Omit the key to leave the tools as-is.
   */
  toolTypes?: EquipmentType[];
}

/**
 * Apply an edit to a mow, returning a NEW mow (never mutates the input).
 * `endedAt` is always recomputed as `startedAt + durationSeconds`, keeping the
 * two timestamps and the duration in lockstep. Rejects any edit that would make
 * the mow end at or before it starts (i.e. a non-positive duration).
 */
export function applyMowEdit(mow: Mow, patch: MowEdit): Mow {
  const startedAt = patch.startedAt ?? mow.startedAt;
  const durationSeconds = patch.durationSeconds ?? mow.durationSeconds;
  const endedAt = startedAt + durationSeconds * 1000;

  if (endedAt <= startedAt) {
    throw new Error('A mow must end after it starts');
  }

  const next: Mow = { ...mow, startedAt, durationSeconds, endedAt };

  if ('notes' in patch) {
    const trimmed = (patch.notes ?? '').trim();
    if (trimmed) next.notes = trimmed;
    else delete next.notes;
  }

  if ('hocInches' in patch) {
    if (typeof patch.hocInches === 'number' && Number.isFinite(patch.hocInches)) {
      next.hocInches = clampHoc(patch.hocInches);
    } else {
      delete next.hocInches;
    }
  }

  if ('clippingBags' in patch) {
    if (typeof patch.clippingBags === 'number' && Number.isFinite(patch.clippingBags)) {
      next.clippingBags = clampBags(patch.clippingBags);
    } else {
      delete next.clippingBags;
    }
  }

  if ('toolTypes' in patch) {
    const normalized = normalizeToolTypes(patch.toolTypes);
    if (normalized) next.toolTypes = normalized;
    else delete next.toolTypes;
  }

  return next;
}
