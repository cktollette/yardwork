/** Display formatting shared by the timer and the mow log. */

/** Format whole seconds as HH:MM:SS. Negatives/fractions are clamped/floored. */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Format an epoch-ms timestamp as a short human date, e.g. "Jul 22, 2026".
 *
 * Built manually rather than via Intl so output is stable across the device
 * locales and Hermes builds we run on.
 */
export function formatMowDate(epochMs: number): string {
  const d = new Date(epochMs);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
