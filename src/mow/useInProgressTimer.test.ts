import { createElement } from 'react';
import { act, create } from 'react-test-renderer';
import { IDLE_TIMER, pause, start, type TimerState } from './mowSegments';
import {
  __resetInProgressTimerStoreForTests,
  publishTimerCleared,
  publishTimerState,
  shouldResumeTimer,
  useInProgressTimer,
  type InProgressSnapshot,
} from './useInProgressTimer';

jest.mock('./timerStorage', () => ({
  loadTimerState: jest.fn(),
}));
import { loadTimerState } from './timerStorage';
const loadState = loadTimerState as jest.Mock;

const T0 = 1_700_000_000_000;

/** Mount the hook and expose its latest snapshot + a rerender flush. */
function mountHook(): { snap: () => InProgressSnapshot } {
  let latest!: InProgressSnapshot;
  function Harness() {
    latest = useInProgressTimer();
    return null;
  }
  act(() => {
    create(createElement(Harness));
  });
  return { snap: () => latest };
}

beforeEach(() => {
  __resetInProgressTimerStoreForTests();
  jest.clearAllMocks();
});

describe('shouldResumeTimer (the launch gate predicate)', () => {
  it('is false when idle, true when running or paused', () => {
    expect(shouldResumeTimer(IDLE_TIMER)).toBe(false);
    expect(shouldResumeTimer(start(T0))).toBe(true); // running
    expect(shouldResumeTimer(pause(start(T0), T0 + 1000))).toBe(true); // paused
  });
});

describe('useInProgressTimer hydration (the gate waits on loaded)', () => {
  it('starts not-loaded, then loads the persisted paused state', async () => {
    const paused = pause(start(T0), T0 + 300_000);
    loadState.mockResolvedValue(paused);

    const { snap } = mountHook();
    // Before hydration resolves, the gate must not render the navigator.
    expect(snap().loaded).toBe(false);

    await act(async () => {}); // flush hydrate
    expect(snap().loaded).toBe(true);
    expect(snap().state).toEqual(paused);
    expect(shouldResumeTimer(snap().state)).toBe(true);
  });

  it('loads idle when nothing is persisted (no resume)', async () => {
    loadState.mockResolvedValue(null);
    const { snap } = mountHook();
    await act(async () => {});
    expect(snap().loaded).toBe(true);
    expect(snap().state).toEqual(IDLE_TIMER);
    expect(shouldResumeTimer(snap().state)).toBe(false);
  });

  it('hydrates from storage only once across multiple mounts', async () => {
    loadState.mockResolvedValue(null);
    mountHook();
    await act(async () => {});
    mountHook();
    await act(async () => {});
    expect(loadState).toHaveBeenCalledTimes(1);
  });
});

describe('publish keeps subscribers in sync (the cross-tab banner)', () => {
  it('reflects a published running state and a subsequent clear', async () => {
    loadState.mockResolvedValue(null);
    const { snap } = mountHook();
    await act(async () => {});

    const running: TimerState = start(T0);
    act(() => publishTimerState(running));
    expect(snap().state).toEqual(running);

    act(() => publishTimerCleared());
    expect(snap().state).toEqual(IDLE_TIMER);
  });
});
