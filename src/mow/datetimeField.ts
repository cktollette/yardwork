/**
 * Pure helpers for editing a mow's start time through plain text fields (no
 * native picker — a v0 choice). Dates are handled in the device's LOCAL time,
 * matching how mows are captured (Date.now) and displayed (formatMowDate).
 */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{2}):(\d{2})$/;

const pad2 = (n: number) => String(n).padStart(2, '0');

/** epoch ms -> 'YYYY-MM-DD' in local time. */
export function formatDateField(epochMs: number): string {
  const d = new Date(epochMs);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** epoch ms -> 'HH:MM' (24-hour) in local time. */
export function formatTimeField(epochMs: number): string {
  const d = new Date(epochMs);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * Parse strict 'YYYY-MM-DD' + 'HH:MM' strings into a local epoch, or null if
 * either is malformed or out of range. Rejects rollover (e.g. Feb 30) by
 * requiring the constructed Date to round-trip to the same components.
 */
export function parseDateTimeField(date: string, time: string): number | null {
  const dm = DATE_RE.exec(date);
  const tm = TIME_RE.exec(time);
  if (!dm || !tm) return null;

  const year = Number(dm[1]);
  const month = Number(dm[2]); // 1-12
  const day = Number(dm[3]);
  const hours = Number(tm[1]);
  const minutes = Number(tm[2]);

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (hours > 23 || minutes > 59) return null;

  const d = new Date(year, month - 1, day, hours, minutes, 0, 0);
  // Reject any silent normalization (Feb 30 -> Mar 2, etc.).
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day ||
    d.getHours() !== hours ||
    d.getMinutes() !== minutes
  ) {
    return null;
  }
  return d.getTime();
}
