import AsyncStorage from '@react-native-async-storage/async-storage';
import { mowRepository } from './asyncStorageRepositories';
import type { Mow, NewMow } from './models';
import { deriveStats } from '../stats/deriveStats';

// In-memory AsyncStorage mock (same as repositories.test.ts).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

beforeEach(async () => {
  await AsyncStorage.clear();
});

// A fixed "now" and a whole-week step. isoWeekIndex is Monday-based UTC, so a
// shift of exactly one WEEK moves a mow to the adjacent ISO-week index.
const NOW = Date.UTC(2026, 6, 22, 12, 0, 0);
const WEEK = 7 * 86_400_000;

function makeNewMow(overrides: Partial<NewMow> = {}): NewMow {
  const startedAt = NOW;
  return {
    propertyId: 'prop-1',
    startedAt,
    endedAt: startedAt + 600 * 1000,
    durationSeconds: 600,
    ...overrides,
  };
}

const currentStreak = (mows: Mow[]) =>
  deriveStats(mows, { areaSqFt: null, now: NOW }).currentStreakWeeks;

describe('stats/streak recomputation after delete', () => {
  it('(a) deleting the only current-week mow keeps the streak via the grace week (D-016)', async () => {
    // Seed a prior-week mow AND a current-week mow so the assertion genuinely
    // exercises the grace-week fallback (not a vacuous 0 -> 0).
    await mowRepository.saveMow(makeNewMow({ startedAt: NOW - WEEK }));
    const current = await mowRepository.saveMow(makeNewMow({ startedAt: NOW }));

    expect(currentStreak(await mowRepository.listMows())).toBe(2); // both weeks

    await mowRepository.delete(current.id);

    // Current week now empty, but last week has a mow: grace week keeps it at 1.
    expect(currentStreak(await mowRepository.listMows())).toBe(1);
  });

  it('(b) deleting below the averages minimum re-locks the stat (D-015)', async () => {
    const base = NOW - 20 * 86_400_000;
    await mowRepository.saveMow(makeNewMow({ startedAt: base }));
    await mowRepository.saveMow(makeNewMow({ startedAt: base + 5 * 86_400_000 }));
    const third = await mowRepository.saveMow(
      makeNewMow({ startedAt: base + 10 * 86_400_000 }),
    );

    const before = deriveStats(await mowRepository.listMows(), { areaSqFt: null, now: NOW });
    expect(before.avgDaysBetweenMows).not.toBeNull(); // unlocked at 3 mows

    await mowRepository.delete(third.id);

    const after = deriveStats(await mowRepository.listMows(), { areaSqFt: null, now: NOW });
    expect(after.avgDaysBetweenMows).toBeNull(); // re-locked at 2 mows
  });
});

describe('stats recomputation after edit', () => {
  it('(c) editing duration changes sq ft per minute', async () => {
    const area = 1000;
    const mow = await mowRepository.saveMow(makeNewMow({ durationSeconds: 600 }));

    const before = deriveStats(await mowRepository.listMows(), { areaSqFt: area, now: NOW });
    expect(before.sqFtPerMinute).toBeCloseTo(100); // 1000 sqft / 10 min

    await mowRepository.update(mow.id, { durationSeconds: 300 });

    const after = deriveStats(await mowRepository.listMows(), { areaSqFt: area, now: NOW });
    expect(after.sqFtPerMinute).toBeCloseTo(200); // 1000 sqft / 5 min
  });

  it('(d) editing the date to move a mow out of the current week recomputes the streak', async () => {
    const mow = await mowRepository.saveMow(makeNewMow({ startedAt: NOW }));
    expect(currentStreak(await mowRepository.listMows())).toBe(1);

    // Move it two whole weeks back — beyond the grace window.
    await mowRepository.update(mow.id, { startedAt: NOW - 2 * WEEK });

    expect(currentStreak(await mowRepository.listMows())).toBe(0);
  });
});
