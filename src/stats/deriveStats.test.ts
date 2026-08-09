import { deriveStats, isoWeekIndex, type StatsMow } from './deriveStats';

/**
 * Build a mow from an ISO-8601 UTC timestamp. We use explicit `Z` (UTC) strings
 * so week bucketing is deterministic regardless of the test runner's timezone —
 * deriveStats buckets ISO weeks in UTC.
 */
function mow(startISO: string, durationSeconds = 1800): StatsMow {
  const startedAt = Date.parse(startISO);
  return { startedAt, endedAt: startedAt + durationSeconds * 1000, durationSeconds };
}

// Reference calendar (2026): Jul 1 = Wed, Jul 4 = Sat, Jul 5 = Sun, Jul 6 = Mon.
const NOW = Date.parse('2026-07-22T12:00:00Z'); // a Wednesday

describe('deriveStats — lifetime + gating', () => {
  it('empty log: zeros, and every gated stat is null (no polygon)', () => {
    const s = deriveStats([], { now: NOW });
    expect(s.lifetimeMows).toBe(0);
    expect(s.lifetimeHours).toBe(0);
    expect(s.lifetimeAreaSqFt).toBeNull();
    expect(s.avgDaysBetweenMows).toBeNull();
    expect(s.avgMowsPerWeek30d).toBeNull();
    expect(s.currentStreakWeeks).toBe(0);
    expect(s.longestStreakWeeks).toBe(0);
    expect(s.sqFtPerMinute).toBeNull();
  });

  it('empty log with a polygon: lifetime area is 0, efficiency still null (no mows)', () => {
    const s = deriveStats([], { now: NOW, areaSqFt: 5000 });
    expect(s.lifetimeAreaSqFt).toBe(0);
    expect(s.sqFtPerMinute).toBeNull();
  });

  it('1 mow: counts it, averages still gated (need 3)', () => {
    const s = deriveStats([mow('2026-07-20T10:00:00Z', 3600)], { now: NOW });
    expect(s.lifetimeMows).toBe(1);
    expect(s.lifetimeHours).toBeCloseTo(1, 10); // 3600s = 1h
    expect(s.avgDaysBetweenMows).toBeNull();
    expect(s.avgMowsPerWeek30d).toBeNull();
  });

  it('2 mows: averages remain gated at exactly one below the threshold', () => {
    const s = deriveStats(
      [mow('2026-07-13T10:00:00Z'), mow('2026-07-20T10:00:00Z')],
      { now: NOW },
    );
    expect(s.lifetimeMows).toBe(2);
    expect(s.avgDaysBetweenMows).toBeNull();
    expect(s.avgMowsPerWeek30d).toBeNull();
  });

  it('3 mows: averages unlock with expected values', () => {
    const s = deriveStats(
      [
        mow('2026-07-06T10:00:00Z'),
        mow('2026-07-13T10:00:00Z'),
        mow('2026-07-20T10:00:00Z'),
      ],
      { now: NOW },
    );
    expect(s.lifetimeMows).toBe(3);
    // span Jul 6 -> Jul 20 = 14 days over 2 gaps = 7 days/mow
    expect(s.avgDaysBetweenMows).toBeCloseTo(7, 10);
    // all 3 fall within the last 30 days: 3 * 7 / 30
    expect(s.avgMowsPerWeek30d).toBeCloseTo((3 * 7) / 30, 10);
  });

  it('gates avgMowsPerWeek30d on total history, but only counts mows in the last 30 days', () => {
    const s = deriveStats(
      [
        mow('2026-01-01T10:00:00Z'), // > 30 days before NOW
        mow('2026-01-08T10:00:00Z'), // > 30 days before NOW
        mow('2026-07-20T10:00:00Z'), // within 30 days
      ],
      { now: NOW },
    );
    // 3 mows total => gate passes; only 1 is inside the 30-day window
    expect(s.avgMowsPerWeek30d).toBeCloseTo((1 * 7) / 30, 10);
    // avg-days-between still uses the full span (Jan 1 -> Jul 20)
    const spanDays = (Date.parse('2026-07-20T10:00:00Z') - Date.parse('2026-01-01T10:00:00Z')) / 86_400_000;
    expect(s.avgDaysBetweenMows).toBeCloseTo(spanDays / 2, 6);
  });
});

describe('deriveStats — polygon gating for area stats', () => {
  const mows = [mow('2026-07-20T10:00:00Z', 1800)]; // 30 min

  it('missing polygon: area stats are null', () => {
    const s = deriveStats(mows, { now: NOW });
    expect(s.lifetimeAreaSqFt).toBeNull();
    expect(s.sqFtPerMinute).toBeNull();
  });

  it('null/zero area is treated as "no polygon"', () => {
    expect(deriveStats(mows, { now: NOW, areaSqFt: null }).sqFtPerMinute).toBeNull();
    expect(deriveStats(mows, { now: NOW, areaSqFt: 0 }).sqFtPerMinute).toBeNull();
  });

  it('with a polygon: lifetime area and efficiency compute', () => {
    const s = deriveStats(mows, { now: NOW, areaSqFt: 6000 });
    expect(s.lifetimeAreaSqFt).toBe(6000); // 6000 * 1 mow
    // 6000 sqft covered in 30 minutes => 200 sqft/min
    expect(s.sqFtPerMinute).toBeCloseTo(200, 10);
  });

  it('efficiency averages area-per-minute across multiple mows', () => {
    // two mows, 6000 sqft each, 30 min + 60 min => 12000 sqft / 90 min
    const s = deriveStats(
      [mow('2026-07-13T10:00:00Z', 1800), mow('2026-07-20T10:00:00Z', 3600)],
      { now: NOW, areaSqFt: 6000 },
    );
    expect(s.sqFtPerMinute).toBeCloseTo(12000 / 90, 10);
  });
});

describe('isoWeekIndex — Sunday vs Monday week boundary', () => {
  it('Saturday and Sunday of the same weekend share one ISO week', () => {
    expect(isoWeekIndex(Date.parse('2026-07-04T12:00:00Z'))).toBe(
      isoWeekIndex(Date.parse('2026-07-05T12:00:00Z')),
    );
  });

  it('Sunday and the following Monday are adjacent ISO weeks', () => {
    const sun = isoWeekIndex(Date.parse('2026-07-05T12:00:00Z'));
    const mon = isoWeekIndex(Date.parse('2026-07-06T12:00:00Z'));
    expect(mon - sun).toBe(1);
  });
});

describe('deriveStats — streaks (ISO weeks, grace week)', () => {
  it('two mows in the same ISO week count as a single streak week', () => {
    const s = deriveStats(
      [mow('2026-07-04T10:00:00Z'), mow('2026-07-05T10:00:00Z')], // Sat + Sun
      { now: Date.parse('2026-07-05T18:00:00Z') },
    );
    expect(s.longestStreakWeeks).toBe(1);
    expect(s.currentStreakWeeks).toBe(1);
  });

  it('Sunday then Monday spans two ISO weeks => streak of 2', () => {
    const s = deriveStats(
      [mow('2026-07-05T10:00:00Z'), mow('2026-07-06T10:00:00Z')], // Sun + Mon
      { now: Date.parse('2026-07-06T18:00:00Z') }, // now in the Monday week
    );
    expect(s.longestStreakWeeks).toBe(2);
    expect(s.currentStreakWeeks).toBe(2);
  });

  it('a mow in the current ISO week counts immediately', () => {
    // NOW is the week of Jul 20-26. Mows in that week + the prior week.
    const s = deriveStats(
      [mow('2026-07-15T10:00:00Z'), mow('2026-07-22T10:00:00Z')],
      { now: NOW },
    );
    expect(s.currentStreakWeeks).toBe(2);
  });

  it('grace week: an empty current week does not break the streak', () => {
    // Mows in the two weeks before NOW's week, nothing in NOW's week.
    const s = deriveStats(
      [mow('2026-07-08T10:00:00Z'), mow('2026-07-15T10:00:00Z')],
      { now: NOW }, // NOW week (Jul 20-26) is empty
    );
    expect(s.currentStreakWeeks).toBe(2); // grace: run ending last week survives
    expect(s.longestStreakWeeks).toBe(2);
  });

  it('a fully-elapsed empty week breaks the current streak', () => {
    // Most recent mow is two weeks before NOW's week => gap of 2 => broken.
    const s = deriveStats(
      [mow('2026-07-01T10:00:00Z'), mow('2026-07-08T10:00:00Z')],
      { now: NOW }, // gap of 2 empty weeks (Jul 13-19, Jul 20-26)
    );
    expect(s.currentStreakWeeks).toBe(0);
    expect(s.longestStreakWeeks).toBe(2); // history still had a 2-week run
  });

  it('longest streak is the longest consecutive run, ignoring gaps', () => {
    const s = deriveStats(
      [
        mow('2026-06-01T10:00:00Z'), // week A
        mow('2026-06-08T10:00:00Z'), // A+1
        mow('2026-06-15T10:00:00Z'), // A+2  (run of 3)
        // gap
        mow('2026-07-06T10:00:00Z'), // later
        mow('2026-07-13T10:00:00Z'), // +1  (run of 2)
      ],
      { now: NOW },
    );
    expect(s.longestStreakWeeks).toBe(3);
  });
});

// Supplementary coverage for the HomeScreen dashboard (PR 2b): the specific
// cases the dashboard leans on — same calendar-day mows and multi-mow totals.
describe('deriveStats — same-day mows and totals', () => {
  it('two mows on the same calendar day count as one streak week', () => {
    const s = deriveStats(
      [
        mow('2026-07-20T08:00:00Z'), // Mon morning
        mow('2026-07-20T18:00:00Z'), // Mon evening, same day
      ],
      { now: NOW },
    );
    expect(s.lifetimeMows).toBe(2);
    expect(s.currentStreakWeeks).toBe(1);
    expect(s.longestStreakWeeks).toBe(1);
  });

  it('sums durations and area across multiple mows', () => {
    const s = deriveStats(
      [
        mow('2026-07-06T10:00:00Z', 1800), // 0.5h
        mow('2026-07-13T10:00:00Z', 3600), // 1.0h
        mow('2026-07-20T10:00:00Z', 5400), // 1.5h
      ],
      { now: NOW, areaSqFt: 5000 },
    );
    expect(s.lifetimeMows).toBe(3);
    expect(s.lifetimeHours).toBeCloseTo(3, 10); // 0.5 + 1 + 1.5
    expect(s.lifetimeAreaSqFt).toBe(15000); // 5000 * 3 mows
  });
});
