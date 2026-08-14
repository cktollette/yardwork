/**
 * Pure, framework-free segment model for a pausable mow timer.
 *
 * EXTENDS D-011 (it does not revisit it): active mowing time is still derived
 * purely from timestamps, never accumulated ticks. An in-progress mow is an
 * array of closed {startedAt, endedAt} segments plus, while running, one open
 * interval (`runningSince`). Pause closes the open interval; Resume opens a new
 * one. Active duration = sum of segment lengths — a crash or dropped interval
 * can never lose or corrupt it.
 *
 * The saved Mow does NOT persist segments (collapse-at-save): Finalize derives
 * the existing startedAt / endedAt / durationSeconds fields from the segment
 * list. A `segments` field would arrive only when a reader for it does.
 */

import { type DraftMow } from './timer';

/** One completed active interval of a mow — a closed timestamp pair. */
export interface Segment {
  /** epoch ms the interval started */
  startedAt: number;
  /** epoch ms the interval ended (pause or finalize) */
  endedAt: number;
}

/**
 * In-progress timer state: the completed segments plus the open interval.
 *   - running: `runningSince` is the open interval's start.
 *   - paused:  `runningSince` is null and there is at least one closed segment.
 *   - idle:    `runningSince` is null and no segments.
 */
export interface TimerState {
  segments: Segment[];
  runningSince: number | null;
}

/** The idle starting state (no timer). */
export const IDLE_TIMER: TimerState = { segments: [], runningSince: null };

export function isRunning(state: TimerState): boolean {
  return state.runningSince !== null;
}
export function isPaused(state: TimerState): boolean {
  return state.runningSince === null && state.segments.length > 0;
}
export function isIdle(state: TimerState): boolean {
  return state.runningSince === null && state.segments.length === 0;
}

/**
 * Active (mowing) duration in whole seconds — NEVER wall-clock. The sum of every
 * closed segment's length plus the open interval so far. Floored to whole
 * seconds and clamped to >= 0 (backwards clock skew reads as 0, like D-011).
 * While paused, `runningSince` is null so this is constant — the display freezes.
 */
export function activeDurationSeconds(state: TimerState, now: number): number {
  let ms = 0;
  for (const seg of state.segments) ms += Math.max(0, seg.endedAt - seg.startedAt);
  if (state.runningSince !== null) ms += Math.max(0, now - state.runningSince);
  return Math.floor(ms / 1000);
}

/** Start a fresh mow (from idle): one open interval, no segments yet. */
export function start(now: number): TimerState {
  return { segments: [], runningSince: now };
}

/** Pause: close the open interval. No-op when already paused/idle. */
export function pause(state: TimerState, now: number): TimerState {
  if (state.runningSince === null) return state;
  return {
    segments: [...state.segments, { startedAt: state.runningSince, endedAt: now }],
    runningSince: null,
  };
}

/** Resume: open a new interval. No-op when already running. */
export function resume(state: TimerState, now: number): TimerState {
  if (state.runningSince !== null) return state;
  return { segments: state.segments, runningSince: now };
}

/**
 * Finalize the mow into a DraftMow. Closes the open interval ONLY when running,
 * so finalizing while paused doesn't close a segment that's already closed
 * (no double-close). Collapses the segments into the existing draft fields.
 */
export function finalize(state: TimerState, now: number): DraftMow {
  const finalSegments =
    state.runningSince !== null
      ? [...state.segments, { startedAt: state.runningSince, endedAt: now }]
      : state.segments;
  return buildDraftFromSegments(finalSegments);
}

/**
 * Collapse a completed segment list into a DraftMow:
 *   - startedAt = first segment's start
 *   - endedAt   = last segment's end (FINAL WALL-CLOCK end — the activity window
 *                 spans first-start → final-end, pauses included)
 *   - durationSeconds = ACTIVE sum of segment lengths (excludes pauses)
 * Empty list (shouldn't happen — finalize is only reachable while running or
 * paused, both of which have a segment) yields a zero draft defensively.
 */
export function buildDraftFromSegments(segments: Segment[]): DraftMow {
  if (segments.length === 0) return { startedAt: 0, endedAt: 0, durationSeconds: 0 };
  let ms = 0;
  for (const seg of segments) ms += Math.max(0, seg.endedAt - seg.startedAt);
  return {
    startedAt: segments[0].startedAt,
    endedAt: segments[segments.length - 1].endedAt,
    durationSeconds: Math.floor(ms / 1000),
  };
}
