/**
 * Static option data for the equipment forms: the type/power/drive choices and
 * the one-tap brand chips. Pure constants — no UI, no I/O — so the pickers and
 * badges stay data-driven and consistent.
 */

import type { DriveType, EquipmentType, PowerSource } from './models';

/** A selectable option with its display label. */
export interface Option<T extends string> {
  value: T;
  label: string;
}

export const EQUIPMENT_TYPES: readonly Option<EquipmentType>[] = [
  { value: 'mower', label: 'Mower' },
  { value: 'trimmer', label: 'Trimmer' },
  { value: 'edger', label: 'Edger' },
  { value: 'blower', label: 'Blower' },
];

export const POWER_SOURCES: readonly Option<PowerSource>[] = [
  { value: 'gas', label: 'Gas' },
  { value: 'battery', label: 'Battery' },
  { value: 'corded', label: 'Corded' },
  { value: 'manual', label: 'Manual' },
];

export const DRIVE_TYPES: readonly Option<DriveType>[] = [
  { value: 'push', label: 'Push' },
  { value: 'self_propelled', label: 'Self-propelled' },
  { value: 'ride', label: 'Ride-on' },
  { value: 'zero_turn', label: 'Zero-turn' },
];

function labelOf<T extends string>(options: readonly Option<T>[], value: T): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

export const equipmentTypeLabel = (t: EquipmentType): string =>
  labelOf(EQUIPMENT_TYPES, t);
export const powerSourceLabel = (p: PowerSource): string =>
  labelOf(POWER_SOURCES, p);

/** Compact type labels for the at-a-glance tool indicators on a mow card. */
const EQUIPMENT_TYPE_SHORT: Record<EquipmentType, string> = {
  mower: 'Mow',
  trimmer: 'Trim',
  edger: 'Edge',
  blower: 'Blow',
};
export const equipmentTypeShortLabel = (t: EquipmentType): string =>
  EQUIPMENT_TYPE_SHORT[t] ?? t;
export const driveTypeLabel = (d: DriveType): string => labelOf(DRIVE_TYPES, d);

/**
 * One-tap brand chips, split by the kind of equipment. Mowers pull from the big
 * riding/walk-behind brands; handheld tools (trimmer/edger/blower) pull from the
 * battery-ecosystem brands people usually stay within across their handhelds.
 * The brand field is still freeform — these are shortcuts, not a closed list.
 */
export const MOWER_BRANDS: readonly string[] = [
  'Honda',
  'Toro',
  'John Deere',
  'Cub Cadet',
  'Husqvarna',
  'EGO',
  'Ryobi',
  'Craftsman',
  'Ariens',
  'Greenworks',
  'Snapper',
  'Troy-Bilt',
  'Kubota',
  'Scotts',
  'Murray',
];

export const HANDHELD_BRANDS: readonly string[] = [
  'Milwaukee',
  'DeWalt',
  'Black+Decker',
  'Kobalt',
  'EGO',
  'Ryobi',
  'Stihl',
  'Echo',
];

/** The brand chips to offer for a given equipment type. */
export function brandsForType(type: EquipmentType): readonly string[] {
  return type === 'mower' ? MOWER_BRANDS : HANDHELD_BRANDS;
}
