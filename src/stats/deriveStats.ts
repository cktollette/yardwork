/**
 * Pure, framework-free stats derivation for the Basic Stats screen.
 *
 * No UI, no persistence, no I/O: given an array of mows, an optional lawn area,
 * and the current time, it returns the derived stat values. `now` is injected
 * (never read from the clock here) so the 30-day and streak math is fully
 * deterministic and testable.
 *
 * Gating (a gated stat returns null so the UI can show an unlock hint):
 *  - averages (avgDaysBetweenMows, avgMowsPerWeek30d) require >= 3 mows
 *  - area-based stats (lifetimeAreaSqFt, sqFtPerMinute) require a polygon
 *    (a positive areaSqFt). No polygon => null.
 * Lifetime counts and streaks always compute (empty log => 0).
 */

const MS_PER_DAY = 86_400_000;
const MS_PER_WEEK = MS_PER_DAY * 7;

/** Minimum mows before averages unlock. */
export const MIN_MOWS_FOR_AVERAGES = 3;

/** The only shape deriveStats needs from a mow — Mow satisfies this structurally. */
export interface StatsMow {
  /** epoch ms when the mow started */
  startedAt: number;
  /** epoch ms when the mow ended */
  endedAt: number;
  /** whole seconds elapsed */
  durationSeconds: number;
}

export interface DeriveStatsOptions {
  /** Lawn area in square feet, or null/undefined when no polygon is drawn yet. */
  areaSqFt?: number | null;
  /** Current time (epoch ms), injected for deterministic 30-day + streak math. */
  now: number;
}

export interface Stats {
  lifetimeMows: number;
  lifetimeHours: number;
  /** area x lifetimeMows; null without a polygon */
  lifetimeAreaSqFt: number | null;
  /** mean days between consecutive mows; null below MIN_MOWS_FOR_AVERAGES */
  avgDaysBetweenMows: number | null;
  /** mows in the last 30 days, expressed per week; null below MIN_MOWS_FOR_AVERAGES */
  avgMowsPerWeek30d: number | null;
  /** consecutive ISO weeks with a mow, ending at/adjacent to now (grace week) */
  currentStreakWeeks: number;
  /** longest run of consecutive ISO weeks with a mow, anywhere in history */
  longestStreakWeeks: number;
  /** area covered per minute across all mows; null without a polygon or time */
  sqFtPerMinute: number | null;
}

/**
 * Monday-based ISO-week index: an integer that increases by exactly 1 for each
 * consecutive ISO week. Computed by snapping the date to the Monday of its ISO
 * week (in UTC, for determinism) and counting weeks — so "consecutive week"
 * checks are plain integer adjacency and cross year boundaries correctly.
 */
export function isoWeekIndex(epochMs: number): number {
  const d = new Date(epochMs);
  // getUTCDay: 0=Sun..6=Sat. Convert to ISO weekday: Mon=0 .. Sun=6.
  const isoDow = (d.getUTCDay() + 6) % 7;
  const midnightUtc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const mondayMs = midnightUtc - isoDow * MS_PER_DAY;
  return Math.floor(mondayMs / MS_PER_WEEK);
}

function computeStreaks(
  weekIndices: number[],
  currentWeek: number,
): { current: number; longest: number } {
  if (weekIndices.length === 0) return { current: 0, longest: 0 };

  const weeks = new Set(weekIndices);
  const sorted = [...weeks].sort((a, b) => a - b);

  // Longest run of consecutive integers anywhere in history.
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = sorted[i] === sorted[i - 1] + 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  // Current streak with the grace-week rule: an empty *current* week does not
  // break the streak (gap of 1 is tolerated), but a fully-elapsed empty week
  // does (gap >= 2 => 0). A mow in the current week counts immediately.
  let current = 0;
  const pastOrPresent = sorted.filter((w) => w <= currentWeek);
  if (pastOrPresent.length > 0) {
    const anchor = pastOrPresent[pastOrPresent.length - 1];
    if (currentWeek - anchor <= 1) {
      let w = anchor;
      while (weeks.has(w)) {
        current++;
        w--;
      }
    }
  }

  return { current, longest };
}

export function deriveStats(mows: StatsMow[], opts: DeriveStatsOptions): Stats {
  const { now } = opts;
  const area = opts.areaSqFt != null && opts.areaSqFt > 0 ? opts.areaSqFt : null;

  const lifetimeMows = mows.length;
  const totalSeconds = mows.reduce((sum, m) => sum + Math.max(0, m.durationSeconds), 0);
  const lifetimeHours = totalSeconds / 3600;
  const totalMinutes = totalSeconds / 60;

  // Area-based stats are gated on a polygon (positive area).
  const lifetimeAreaSqFt = area !== null ? area * lifetimeMows : null;
  const sqFtPerMinute =
    area !== null && lifetimeMows > 0 && totalMinutes > 0
      ? (area * lifetimeMows) / totalMinutes
      : null;

  // Averages are gated on a minimum history.
  let avgDaysBetweenMows: number | null = null;
  let avgMowsPerWeek30d: number | null = null;
  if (lifetimeMows >= MIN_MOWS_FOR_AVERAGES) {
    const starts = mows.map((m) => m.startedAt).sort((a, b) => a - b);
    const spanDays = (starts[starts.length - 1] - starts[0]) / MS_PER_DAY;
    avgDaysBetweenMows = spanDays / (starts.length - 1);

    const windowStart = now - 30 * MS_PER_DAY;
    const inWindow = mows.filter(
      (m) => m.startedAt > windowStart && m.startedAt <= now,
    ).length;
    avgMowsPerWeek30d = (inWindow * 7) / 30;
  }

  const { current, longest } = computeStreaks(
    mows.map((m) => isoWeekIndex(m.startedAt)),
    isoWeekIndex(now),
  );

  return {
    lifetimeMows,
    lifetimeHours,
    lifetimeAreaSqFt,
    avgDaysBetweenMows,
    avgMowsPerWeek30d,
    currentStreakWeeks: current,
    longestStreakWeeks: longest,
    sqFtPerMinute,
  };
}
