import { useEffect, useState } from 'react';
import { IDLE_TIMER, isIdle, type TimerState } from './mowSegments';
import { loadTimerState } from './timerStorage';

/**
 * A tiny shared store for the ONE in-progress mow timer, so several surfaces stay
 * in sync without a state library: the launch gate (cold-launch routing, item 3),
 * the cross-tab in-progress banner (item 4), and the Timer screen itself.
 *
 * The Timer screen remains the writer — it owns local state and persists every
 * transition — but it also PUBLISHES here so the banner reflects the live state.
 * On launch the store hydrates once from storage (the same loadTimerState the
 * Timer screen uses, which also performs quarantine), so the gate can decide
 * whether to resume before the navigator renders.
 */

export interface InProgressSnapshot {
  /** false until the first hydrate resolves — the gate waits on this. */
  loaded: boolean;
  state: TimerState;
}

let current: InProgressSnapshot = { loaded: false, state: IDLE_TIMER };
let hydrateStarted = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

/** Latest timer state — call from the Timer screen on every transition/restore. */
export function publishTimerState(state: TimerState): void {
  current = { loaded: true, state };
  emit();
}

/** Reset the store to idle — call on Finalize. */
export function publishTimerCleared(): void {
  current = { loaded: true, state: IDLE_TIMER };
  emit();
}

/**
 * Hydrate the store from storage exactly once. Safe to call from many mounts;
 * only the first triggers the read. Resolves the `loaded` gate.
 */
export async function hydrateInProgressTimer(): Promise<void> {
  if (hydrateStarted) return;
  hydrateStarted = true;
  const restored = await loadTimerState();
  current = { loaded: true, state: restored ?? IDLE_TIMER };
  emit();
}

/** Subscribe to the shared in-progress timer snapshot. */
export function useInProgressTimer(): InProgressSnapshot {
  const [snap, setSnap] = useState<InProgressSnapshot>(current);
  useEffect(() => {
    const listener = () => setSnap(current);
    listeners.add(listener);
    void hydrateInProgressTimer();
    listener(); // catch a change between first render and subscribe
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return snap;
}

/**
 * Whether a hydrated snapshot represents a mow to resume (running or paused).
 * Idle → no resume. Used by the launch gate to route to the Timer screen.
 */
export function shouldResumeTimer(state: TimerState): boolean {
  return !isIdle(state);
}

/** Reset module state between tests (the store is a module-level singleton). */
export function __resetInProgressTimerStoreForTests(): void {
  current = { loaded: false, state: IDLE_TIMER };
  hydrateStarted = false;
  listeners.clear();
}
