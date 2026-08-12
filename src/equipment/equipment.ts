/**
 * Pure equipment logic: display-name derivation and the normalization/edit rules
 * that keep a stored Equipment well-formed. No UI, no persistence — the
 * repository and screens lean on these so the invariants live in one tested place.
 */

import type { Equipment, EquipmentEdit } from './models';

/**
 * The name to show for a piece of equipment: its nickname when set, otherwise
 * "brand model" — or just the brand when the model is absent (it's optional).
 * Whitespace-only nicknames fall through to brand(+model).
 */
export function displayName(
  e: Pick<Equipment, 'nickname' | 'brand' | 'model'>,
): string {
  const nick = e.nickname?.trim();
  if (nick) return nick;
  return [e.brand, e.model]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
}

/**
 * Return a well-formed copy of an Equipment: brand/model/nickname trimmed, a
 * blank nickname dropped, and `driveType` dropped whenever the type is not a
 * mower (drive type is mower-only, D-035). Never mutates the input.
 */
export function normalizeEquipment(e: Equipment): Equipment {
  const next: Equipment = {
    ...e,
    brand: e.brand.trim(),
  };

  // Model is optional: keep a trimmed value, drop a blank/absent one so stored
  // data never carries an empty-string model.
  const model = e.model?.trim();
  if (model) next.model = model;
  else delete next.model;

  const nick = e.nickname?.trim();
  if (nick) next.nickname = nick;
  else delete next.nickname;

  if (next.type !== 'mower') delete next.driveType;

  return next;
}

/**
 * Apply an edit to a piece of equipment, returning a NEW normalized Equipment
 * (never mutates the input). Only keys present in the patch are applied;
 * `nickname` clears on blank and `driveType` clears on an explicit undefined
 * (and is also dropped by normalization when the type is not a mower).
 */
export function applyEquipmentEdit(existing: Equipment, patch: EquipmentEdit): Equipment {
  const next: Equipment = { ...existing };

  if (patch.type !== undefined) next.type = patch.type;
  if (patch.brand !== undefined) next.brand = patch.brand;
  if (patch.model !== undefined) next.model = patch.model;
  if (patch.powerSource !== undefined) next.powerSource = patch.powerSource;
  if ('nickname' in patch) next.nickname = patch.nickname;
  if ('driveType' in patch) next.driveType = patch.driveType;

  return normalizeEquipment(next);
}
