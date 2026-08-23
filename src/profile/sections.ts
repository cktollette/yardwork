import type { Stats } from '../stats/deriveStats';
import { SEGMENT_SEPARATOR } from './profileHeader';

/**
 * Pure subtitle builders for the Profile sections list. ASCII only; multi-part
 * subtitles join with SEGMENT_SEPARATOR (" - "). Each has an explicit empty state.
 */

const MS_PER_DAY = 86_400_000;

/** Coarse relative date for "Last mow: ...". `now` injected for determinism. */
export function formatRelativeDate(epochMs: number, now: number): string {
  const days = Math.floor((now - epochMs) / MS_PER_DAY);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  return months <= 1 ? '1 month ago' : `${months} months ago`;
}

/** Statistics row: "N mows - X.Xh", or an empty state. */
export function statisticsSubtitle(stats: Pick<Stats, 'lifetimeMows' | 'lifetimeHours'>): string {
  if (stats.lifetimeMows === 0) return 'No mows yet';
  return [`${stats.lifetimeMows} mows`, `${stats.lifetimeHours.toFixed(1)}h`].join(
    SEGMENT_SEPARATOR,
  );
}

/** Mows row: "Last mow: <relative>", or an empty state. */
export function mowsSubtitle(lastMowStartedAt: number | null, now: number): string {
  if (lastMowStartedAt == null) return 'No mows yet';
  return `Last mow: ${formatRelativeDate(lastMowStartedAt, now)}`;
}

/** My Lawn row: "N zones - X sq ft", or an empty state. */
export function myLawnSubtitle(zoneCount: number, areaSqFt: number): string {
  if (zoneCount === 0) return 'No lawn drawn yet';
  const zones = `${zoneCount} ${zoneCount === 1 ? 'zone' : 'zones'}`;
  const area = `${Math.round(areaSqFt).toLocaleString()} sq ft`;
  return [zones, area].join(SEGMENT_SEPARATOR);
}

/** Garage row: "N pieces", or an empty state. */
export function garageSubtitle(count: number): string {
  if (count === 0) return 'Garage is empty';
  return `${count} ${count === 1 ? 'piece' : 'pieces'}`;
}
