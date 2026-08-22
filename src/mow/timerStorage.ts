import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DraftMow } from './timer';
import { buildDraftFromSegments, type Segment, type TimerState } from './mowSegments';

/**
 * Persistence for an in-progress (possibly paused) mow timer.
 *
 * We persist the whole TimerState — the closed segments plus `runningSince` —
 * because a paused mow has no single "started" instant. Active time is still
 * derived from timestamps (D-011), never stored as an accumulated count, so a
 * crash/force-quit loses nothing: a running timer restores its open interval, a
 * paused timer restores frozen.
 *
 * The blob is VERSIONED (an `{ v, state }` envelope) so the shape can migrate
 * forward safely. Two legacy shapes predate the envelope and both migrate on
 * read:
 *   - v1: a bare `startedAt` number (the pre-pause start/stop build) restores as
 *     a running, single-open-segment timer.
 *   - v2 (unversioned): a bare `{ segments, runningSince }` object (the first
 *     pause/resume build, #50) is accepted as-is and re-wrapped on next write.
 *
 * A blob that survives parsing but fails structural validation is NEVER dropped
 * silently: it is copied to `UNRECOVERABLE_TIMER_KEY` (and only then removed from
 * the running key) so a launch-time recovery prompt can offer to log it manually.
 * Every failure path is dev-logged; a bad value must not crash startup.
 */
export const RUNNING_TIMER_KEY = '@yardwork/mow-timer/running';

/** Where an unrestorable blob is quarantined for manual recovery (never deleted). */
export const UNRECOVERABLE_TIMER_KEY = '@yardwork/mow-timer/unrecoverable';

/** Current on-disk envelope version. */
export const CURRENT_TIMER_VERSION = 2;

interface TimerEnvelope {
  v: number;
  state: TimerState;
}

/** `__DEV__`-gated diagnostic, matching the per-domain `[tag]` convention (D-056). */
function devLog(message: string): void {
  if (__DEV__) console.warn(`[timer] ${message}`);
}

/** Persist the current timer state under the current envelope version. */
export async function saveTimerState(state: TimerState): Promise<void> {
  const envelope: TimerEnvelope = { v: CURRENT_TIMER_VERSION, state };
  try {
    await AsyncStorage.setItem(RUNNING_TIMER_KEY, JSON.stringify(envelope));
  } catch (e) {
    // A dropped write means a transition won't survive a kill — surface it in dev
    // rather than fail the (fire-and-forget) call and lose the reason.
    devLog(`save failed, timer transition not persisted: ${String(e)}`);
  }
}

/**
 * Load a persisted timer state, or `null` when there is no timer, the value is a
 * degenerate no-timer marker, or it was unrestorable (in which case it has been
 * quarantined). Never throws.
 */
export async function loadTimerState(): Promise<TimerState | null> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(RUNNING_TIMER_KEY);
  } catch (e) {
    devLog(`read failed: ${String(e)}`);
    return null;
  }
  if (raw == null || raw.trim() === '') return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    await quarantine(raw, 'unparseable');
    return null;
  }

  // v1 legacy: a bare startedAt number = a running timer with one open interval.
  if (typeof parsed === 'number') {
    // A degenerate number (0/NaN/negative) is "no timer", not corrupt data — keep
    // the old contract and don't quarantine it.
    return Number.isFinite(parsed) && parsed > 0
      ? { segments: [], runningSince: parsed }
      : null;
  }

  // v2 envelope, or the unversioned v2 object — unwrap then validate.
  const candidate = unwrap(parsed);
  if (isValidTimerState(candidate)) return candidate;

  await quarantine(raw, 'invalid-shape');
  return null;
}

/** Clear the persisted running timer (called on Finalize). */
export async function clearTimerState(): Promise<void> {
  await AsyncStorage.removeItem(RUNNING_TIMER_KEY);
}

/** The quarantined raw blob, if one is awaiting manual recovery. */
export async function loadUnrecoverableRaw(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(UNRECOVERABLE_TIMER_KEY);
  } catch (e) {
    devLog(`unrecoverable read failed: ${String(e)}`);
    return null;
  }
}

/** Clear the quarantine slot (after the user logs it manually or dismisses). */
export async function clearUnrecoverable(): Promise<void> {
  await AsyncStorage.removeItem(UNRECOVERABLE_TIMER_KEY);
}

/**
 * Best-effort salvage of a draft from an unrestorable raw blob, for the recovery
 * prompt. Extracts a start time (and, when any closed segments survived, an
 * active duration + end) so the manual-log flow can be pre-filled. Returns `null`
 * when nothing usable — not even a plausible start timestamp — can be recovered.
 */
export function salvageDraft(raw: string): DraftMow | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed === 'number') {
    return Number.isFinite(parsed) && parsed > 0
      ? { startedAt: parsed, endedAt: parsed, durationSeconds: 0 }
      : null;
  }
  const state = unwrap(parsed);
  if (state === null || typeof state !== 'object') return null;
  const s = state as { segments?: unknown; runningSince?: unknown };

  const validSegments: Segment[] = Array.isArray(s.segments)
    ? s.segments.filter(isValidSegment)
    : [];
  if (validSegments.length > 0) {
    // Reuse the finalize-time collapse (active sum, first start → last end).
    return buildDraftFromSegments([...validSegments].sort((a, b) => a.startedAt - b.startedAt));
  }

  // No usable segments — salvage a lone running-since start, if present.
  const start = s.runningSince;
  return typeof start === 'number' && Number.isFinite(start) && start > 0
    ? { startedAt: start, endedAt: start, durationSeconds: 0 }
    : null;
}

/**
 * Move an unrestorable blob to the quarantine slot. Copies FIRST and only removes
 * the running key once the copy is safely stored, so a failure here can never
 * destroy the blob (the never-delete invariant).
 */
async function quarantine(raw: string, reason: string): Promise<void> {
  try {
    await AsyncStorage.setItem(UNRECOVERABLE_TIMER_KEY, raw);
    await AsyncStorage.removeItem(RUNNING_TIMER_KEY);
    devLog(`quarantined unrestorable timer (${reason}); left for manual recovery`);
  } catch (e) {
    devLog(`quarantine failed, blob left in place (${reason}): ${String(e)}`);
  }
}

/** Unwrap a `{ v, state }` envelope; a bare object is treated as its own state. */
function unwrap(parsed: unknown): unknown {
  return parsed !== null && typeof parsed === 'object' && 'v' in (parsed as object)
    ? (parsed as { state?: unknown }).state
    : parsed;
}

function isValidSegment(seg: unknown): seg is Segment {
  if (seg == null || typeof seg !== 'object') return false;
  const p = seg as Partial<Segment>;
  return (
    typeof p.startedAt === 'number' &&
    Number.isFinite(p.startedAt) &&
    typeof p.endedAt === 'number' &&
    Number.isFinite(p.endedAt)
  );
}

/** Structural validation — a bad shape reads as "no timer" (and is quarantined). */
function isValidTimerState(value: unknown): value is TimerState {
  if (value == null || typeof value !== 'object') return false;
  const s = value as { segments?: unknown; runningSince?: unknown };
  if (!Array.isArray(s.segments)) return false;
  const runningOk =
    s.runningSince === null ||
    (typeof s.runningSince === 'number' && Number.isFinite(s.runningSince));
  if (!runningOk) return false;
  return s.segments.every(isValidSegment);
}
