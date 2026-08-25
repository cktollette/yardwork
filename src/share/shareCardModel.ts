import { coveredAreaSqFt } from '../lawn/zones';
import { equipmentTypeLabel } from '../equipment/catalog';
import { formatDuration, formatMowDate } from '../mow/format';
import type { Mow, Zone } from '../mow/models';

/**
 * Pure builder for the Mow Share Card view-model. No UI, no I/O: given a saved
 * mow, the property's zones, and the full mow history, it returns the display
 * strings, the ring data, and the omit decisions the card renders.
 *
 * Copy is ASCII-only (card standing rule): no degree sign, no em dashes, no
 * non-ASCII separators. Absent fields are OMITTED (null), never substituted.
 */

/** A ring's data on the card. `progress` omitted => full ring. */
export interface ShareCardRing {
  value: string;
  label: string;
  progress?: number;
}

export interface ShareCardModel {
  dateLabel: string;
  durationLabel: string;
  /** null => omit (no weather captured). */
  tempLabel: string | null;
  /** null => omit (no tools recorded). e.g. "Mower, Trimmer". */
  toolsLabel: string | null;
  /** null => omit (no lawn area). Full ring of the area this mow covered. */
  areaRing: ShareCardRing | null;
  /** null => omit (no area, or no computable rate). Progress ring: this mow vs
   *  your personal best. */
  efficiencyRing: ShareCardRing | null;
  /**
   * The mow's stored AFTER photo (app-owned, already downscaled + EXIF-stripped
   * by the PhotoStore, D-057) to render as the full-bleed card background, or null
   * when the mow has no after photo. Never a camera-roll original.
   */
  backgroundPhotoUri: string | null;
}

type ZoneArea = Pick<Zone, 'id' | 'areaSqFt'>;

/** ASCII compact number: 4298 -> "4.3k", 43000 -> "43k". */
function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1_000)}k`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}

/** Area covered per minute for one mow, or null when it can't be computed. */
export function perMowSqFtPerMinute(mow: Mow, zones: ZoneArea[]): number | null {
  const area = coveredAreaSqFt(mow.zoneIds, zones);
  const minutes = mow.durationSeconds / 60;
  return area > 0 && minutes > 0 ? area / minutes : null;
}

/**
 * The best area-per-minute across the given mows (each measured against the SAME
 * zones). Pass the list that INCLUDES the current mow, so a personal-best mow
 * ties the max and its efficiency ring renders full (progress 1). null when no
 * mow has a computable rate.
 */
export function bestSqFtPerMinute(mows: Mow[], zones: ZoneArea[]): number | null {
  let best: number | null = null;
  for (const mow of mows) {
    const rate = perMowSqFtPerMinute(mow, zones);
    if (rate !== null && (best === null || rate > best)) best = rate;
  }
  return best;
}

export function buildShareCardModel(
  mow: Mow,
  zones: ZoneArea[],
  allMows: Mow[],
): ShareCardModel {
  const area = coveredAreaSqFt(mow.zoneIds, zones);
  const thisRate = perMowSqFtPerMinute(mow, zones);
  const best = bestSqFtPerMinute(allMows, zones);

  const areaRing: ShareCardRing | null =
    area > 0 ? { value: compact(area), label: 'sq ft' } : null;

  const efficiencyRing: ShareCardRing | null =
    thisRate !== null && best !== null && best > 0
      ? {
          value: compact(thisRate),
          label: 'sq ft/min',
          // best includes this mow, so thisRate <= best and progress <= 1; a
          // personal-best mow renders a full ring (progress 1).
          progress: Math.max(0, Math.min(1, thisRate / best)),
        }
      : null;

  const tools = mow.toolTypes ?? [];

  return {
    dateLabel: formatMowDate(mow.startedAt),
    durationLabel: formatDuration(mow.durationSeconds),
    tempLabel: mow.weather ? `${mow.weather.tempF}F` : null,
    toolsLabel: tools.length > 0 ? tools.map(equipmentTypeLabel).join(', ') : null,
    areaRing,
    efficiencyRing,
    backgroundPhotoUri: mow.afterPhotoUri ?? null,
  };
}
