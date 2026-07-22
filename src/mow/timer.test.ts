import { buildDraftMow, computeElapsedSeconds } from './timer';

describe('computeElapsedSeconds', () => {
  it('is 0 at the moment the timer starts', () => {
    const t = 1_700_000_000_000;
    expect(computeElapsedSeconds(t, t)).toBe(0);
  });

  it('floors to whole seconds (sub-second remainder dropped)', () => {
    const t = 1_700_000_000_000;
    expect(computeElapsedSeconds(t, t + 1_999)).toBe(1);
  });

  it('computes a normal short elapsed', () => {
    const t = 1_700_000_000_000;
    expect(computeElapsedSeconds(t, t + 90_000)).toBe(90); // 90s
  });

  it('handles a 40+ minute elapsed (long mow / app was closed)', () => {
    const t = 1_700_000_000_000;
    const fortyMin = 40 * 60 * 1000;
    expect(computeElapsedSeconds(t, t + fortyMin)).toBe(2400);
  });

  it('clamps to 0 on backwards clock skew (now < startedAt)', () => {
    const t = 1_700_000_000_000;
    expect(computeElapsedSeconds(t, t - 5_000)).toBe(0);
  });
});

describe('buildDraftMow', () => {
  it('produces { startedAt, endedAt, durationSeconds }', () => {
    const startedAt = 1_700_000_000_000;
    const endedAt = startedAt + 2400 * 1000;
    expect(buildDraftMow(startedAt, endedAt)).toEqual({
      startedAt,
      endedAt,
      durationSeconds: 2400,
    });
  });
});
