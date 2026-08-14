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
 *  - `zoneIds` sets which zones the mow covered (deduped), or clears to "whole
 *    lawn" (absent) when the value is empty/undefined. The save/edit flow
 *    collapses an all-zones selection to `undefined` before calling this, so a
 *    full-membership array is never stored (see models.ts).
 *  - `beforePhotoUri` / `afterPhotoUri` set the slot's stored URI, or clear it
 *    when the patch value is `undefined`. The value here is ALREADY an app-owned
 *    URI: the repository copies the picker temp URI into the store (and deletes
 *    the superseded file) around this pure transform — no file I/O happens here.
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
  /**
   * New zone coverage (deduped). An empty array or `undefined` clears it to
   * "whole lawn" (absent). Omit the key to leave coverage as-is — the edit flow
   * only sends this on real picker interaction, never from a seeded diff.
   */
  zoneIds?: string[];
  /**
   * New before/after photo URIs (already app-owned; the repository resolves
   * picker temp URIs to these before applying). An explicit `undefined` clears
   * the slot. Omit the key to leave that slot as-is.
   */
  beforePhotoUri?: string;
  afterPhotoUri?: string;
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
  // Recompute endedAt only when a time field is actually edited; otherwise keep
  // the stored endedAt truthful. A paused mow (collapse-at-save) stores endedAt
  // as the FINAL WALL-CLOCK end, which exceeds startedAt+duration — a non-time
  // edit (e.g. notes) must not collapse it. A time edit DOES collapse the
  // wall-clock span to startedAt+duration: segment provenance isn't persisted,
  // so there's nothing to reflow — deliberate under collapse-at-save, not a bug.
  const timeEdited = 'startedAt' in patch || 'durationSeconds' in patch;
  const endedAt = timeEdited ? startedAt + durationSeconds * 1000 : mow.endedAt;

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

  // Zone coverage: a non-empty (deduped) array sets it; empty/undefined clears
  // to "whole lawn" (absent). The screen collapses an all-zones selection to
  // undefined before this, so a full-membership array never reaches storage.
  if ('zoneIds' in patch) {
    const ids = patch.zoneIds ? [...new Set(patch.zoneIds)] : [];
    if (ids.length > 0) next.zoneIds = ids;
    else delete next.zoneIds;
  }

  // Photo slots: present string sets, present-undefined clears (the repository
  // has already resolved any picker temp URI to an app URI). Independent slots.
  if ('beforePhotoUri' in patch) {
    if (patch.beforePhotoUri) next.beforePhotoUri = patch.beforePhotoUri;
    else delete next.beforePhotoUri;
  }
  if ('afterPhotoUri' in patch) {
    if (patch.afterPhotoUri) next.afterPhotoUri = patch.afterPhotoUri;
    else delete next.afterPhotoUri;
  }

  return next;
}
