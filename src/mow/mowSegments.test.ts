import {
  IDLE_TIMER,
  activeDurationSeconds,
  buildDraftFromSegments,
  finalize,
  isIdle,
  isPaused,
  isRunning,
  pause,
  resume,
  start,
  type TimerState,
} from './mowSegments';
import { needsShortMowConfirmation } from './mowValidation';

const T0 = 1_700_000_000_000;

describe('mowSegments — state predicates', () => {
  it('classifies idle / running / paused', () => {
    expect(isIdle(IDLE_TIMER)).toBe(true);
    const running = start(T0);
    expect(isRunning(running)).toBe(true);
    const paused = pause(running, T0 + 60_000);
    expect(isPaused(paused)).toBe(true);
    expect(isRunning(paused)).toBe(false);
  });
});

describe('mowSegments — active duration (timestamp-derived, no ticks)', () => {
  it('running: counts the open interval up to now', () => {
    const s = start(T0);
    expect(activeDurationSeconds(s, T0 + 90_000)).toBe(90);
  });

  it('paused: is frozen — independent of now', () => {
    const paused = pause(start(T0), T0 + 120_000); // 2 min of active time, then pause
    expect(activeDurationSeconds(paused, T0 + 120_000)).toBe(120);
    // A later "now" (still paused) does not advance it.
    expect(activeDurationSeconds(paused, T0 + 999_000)).toBe(120);
  });

  it('resumed: sums closed segments plus the new open interval', () => {
    let s = start(T0);
    s = pause(s, T0 + 120_000); // segment 1: 120s
    s = resume(s, T0 + 600_000); // paused 8 min, then resume
    expect(activeDurationSeconds(s, T0 + 600_000 + 30_000)).toBe(150); // 120 + 30
  });
});

describe('mowSegments — pause immediately after start (zero-length segment)', () => {
  it('closes a ~0s segment harmlessly; a later resume+run still counts', () => {
    let s = pause(start(T0), T0); // pause at the same instant → 0-length segment
    expect(activeDurationSeconds(s, T0)).toBe(0);
    s = resume(s, T0 + 10_000);
    expect(activeDurationSeconds(s, T0 + 10_000 + 45_000)).toBe(45); // 0 + 45
  });
});

describe('mowSegments — finalize', () => {
  it('while running, closes the open interval into the draft', () => {
    const draft = finalize(start(T0), T0 + 1800_000); // 30 min straight
    expect(draft).toEqual({ startedAt: T0, endedAt: T0 + 1800_000, durationSeconds: 1800 });
  });

  it('while paused, builds from closed segments without double-closing', () => {
    const paused = pause(start(T0), T0 + 300_000); // one 5-min segment, then paused
    const draft = finalize(paused, T0 + 999_000); // finalize much later while paused
    // endedAt is the pause instant (last closed segment), NOT the finalize `now`.
    expect(draft).toEqual({ startedAt: T0, endedAt: T0 + 300_000, durationSeconds: 300 });
  });
});

describe('mowSegments — collapse-at-save fields + the ACTIVE-duration guard', () => {
  // 45s of active mowing wrapped around a ~9.5-minute pause.
  const segments = [
    { startedAt: T0, endedAt: T0 + 30_000 }, // 30s
    { startedAt: T0 + 600_000, endedAt: T0 + 615_000 }, // 15s, after a 9.5-min pause
  ];
  const draft = buildDraftFromSegments(segments);

  it('endedAt is the final wall-clock end; durationSeconds is the ACTIVE sum', () => {
    expect(draft.startedAt).toBe(T0);
    expect(draft.endedAt).toBe(T0 + 615_000); // final wall-clock end (activity window)
    expect(draft.durationSeconds).toBe(45); // 30 + 15 active, NOT 615 wall-clock
    // The wall-clock span is ~10.25 min — proves duration is not endedAt-startedAt.
    expect((draft.endedAt - draft.startedAt) / 1000).toBe(615);
  });

  it('the short-mow guard runs on ACTIVE duration, not wall-clock', () => {
    // Active 45s < floor → confirm. If it used the 615s wall-clock span it would NOT.
    expect(needsShortMowConfirmation(draft.durationSeconds)).toBe(true);
    expect(needsShortMowConfirmation(615)).toBe(false); // the wall-clock span would pass
  });
});
