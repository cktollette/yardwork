import { Alert, Modal } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import MowTimerScreen from './MowTimerScreen';
import type { TimerState } from './mowSegments';

// No onboarding Alert: pretend it's dismissed and the lawn is drawn. First-mow
// sheet defaults OFF (dismissed) so the transition tests aren't affected; the
// dedicated test below flips it on.
jest.mock('../lawn/prompts', () => ({
  shouldShowOnboarding: jest.fn(() => false),
  isOnboardingDismissed: jest.fn(() => Promise.resolve(true)),
  dismissOnboarding: jest.fn(),
  hasLawn: jest.fn(() => true),
  isFirstMowSheetDismissed: jest.fn(() => Promise.resolve(true)),
  dismissFirstMowSheet: jest.fn(),
  shouldShowFirstMowSheet: jest.fn(() => false),
}));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const prompts = require('../lawn/prompts');
jest.mock('./asyncStorageRepositories', () => ({
  propertyRepository: {
    getOrCreateDefault: jest.fn(() => Promise.resolve({ id: 'prop-1', zones: [] })),
  },
}));
jest.mock('./timerStorage', () => ({
  loadTimerState: jest.fn(),
  saveTimerState: jest.fn(),
  clearTimerState: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const timerStorage = require('./timerStorage');

const navigation = { navigate: jest.fn() };
const T0 = 1_700_000_000_000;
let NOW = T0;

async function renderTimer(): Promise<ReactTestRenderer> {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(<MowTimerScreen navigation={navigation as never} route={{} as never} />);
  });
  await act(async () => {}); // flush restore + onboarding effects
  return tree;
}

function press(tree: ReactTestRenderer, label: string): void {
  act(() => {
    tree.root.findByProps({ accessibilityLabel: label }).props.onPress();
  });
}
function has(tree: ReactTestRenderer, label: string): boolean {
  return tree.root.findAllByProps({ accessibilityLabel: label }).length > 0;
}
function labelText(tree: ReactTestRenderer): string {
  return JSON.stringify(tree.toJSON());
}

beforeEach(() => {
  jest.clearAllMocks();
  // Fake timers so the running-timer's cosmetic 1s interval never fires
  // uncontrolled (and can't re-render after teardown). Date stays real so the
  // Date.now spy below drives the clock.
  jest.useFakeTimers({ doNotFake: ['Date'] });
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(Date, 'now').mockImplementation(() => NOW);
  NOW = T0;
  timerStorage.loadTimerState.mockResolvedValue(null); // idle by default
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('MowTimerScreen — pause / resume / finalize', () => {
  it('idle → Start persists a running state and shows Pause + Finalize', async () => {
    const tree = await renderTimer();
    expect(has(tree, 'Start')).toBe(true);

    press(tree, 'Start');

    expect(timerStorage.saveTimerState).toHaveBeenCalledWith({ segments: [], runningSince: T0 });
    expect(has(tree, 'Pause')).toBe(true);
    expect(has(tree, 'Finalize')).toBe(true);
    expect(labelText(tree)).toContain('Mowing');
  });

  it('Pause closes the segment, persists paused state, and freezes the label', async () => {
    const tree = await renderTimer();
    press(tree, 'Start'); // running at T0
    NOW = T0 + 120_000; // 2 minutes of mowing
    press(tree, 'Pause');

    expect(timerStorage.saveTimerState).toHaveBeenLastCalledWith({
      segments: [{ startedAt: T0, endedAt: T0 + 120_000 }],
      runningSince: null,
    });
    expect(labelText(tree)).toContain('Paused');
    expect(has(tree, 'Resume')).toBe(true);
    expect(has(tree, 'Finalize')).toBe(true);
    // Frozen active duration = 2:00.
    expect(labelText(tree)).toContain('00:02:00');
  });

  it('Resume opens a new interval (persists a running state)', async () => {
    const tree = await renderTimer();
    press(tree, 'Start');
    NOW = T0 + 120_000;
    press(tree, 'Pause');
    NOW = T0 + 600_000; // 8-min phone call
    press(tree, 'Resume');

    expect(timerStorage.saveTimerState).toHaveBeenLastCalledWith({
      segments: [{ startedAt: T0, endedAt: T0 + 120_000 }],
      runningSince: T0 + 600_000,
    });
    expect(labelText(tree)).toContain('Mowing');
  });

  it('Finalize while running hands a draft to Save (active duration) and clears', async () => {
    const tree = await renderTimer();
    press(tree, 'Start');
    NOW = T0 + 1800_000; // 30 min
    press(tree, 'Finalize');

    expect(timerStorage.clearTimerState).toHaveBeenCalled();
    expect(navigation.navigate).toHaveBeenCalledWith('SaveMow', {
      draft: { startedAt: T0, endedAt: T0 + 1800_000, durationSeconds: 1800 },
    });
  });

  it('Finalize while paused builds from closed segments (no double-close)', async () => {
    const tree = await renderTimer();
    press(tree, 'Start');
    NOW = T0 + 300_000; // 5 min active
    press(tree, 'Pause');
    NOW = T0 + 999_000; // finalize much later, still paused
    press(tree, 'Finalize');

    // endedAt is the pause instant, not the finalize `now`; duration = active 5m.
    expect(navigation.navigate).toHaveBeenCalledWith('SaveMow', {
      draft: { startedAt: T0, endedAt: T0 + 300_000, durationSeconds: 300 },
    });
  });
});

describe('MowTimerScreen — Statistics link (orphan-safe after tab restructure)', () => {
  it('the idle Stats link navigates to the pushed Statistics route, not a dead tab', async () => {
    const tree = await renderTimer(); // idle by default
    press(tree, 'Statistics');
    expect(navigation.navigate).toHaveBeenCalledWith('Statistics');
    // It must NOT reach the removed Stats tab.
    expect(navigation.navigate).not.toHaveBeenCalledWith('Tabs', { screen: 'Stats' });
  });
});

describe('MowTimerScreen — first-mow sheet', () => {
  const sheetVisible = (tree: ReactTestRenderer): boolean =>
    tree.root.findByType(Modal).props.visible;

  it('shows the coaching sheet on the first Start, and persists so it never returns', async () => {
    prompts.isFirstMowSheetDismissed.mockResolvedValue(false);
    prompts.shouldShowFirstMowSheet.mockReturnValue(true);

    const tree = await renderTimer();
    expect(sheetVisible(tree)).toBe(false); // not before Start

    press(tree, 'Start');
    expect(sheetVisible(tree)).toBe(true);
    expect(prompts.dismissFirstMowSheet).toHaveBeenCalled(); // persisted
  });

  it('does not show when the gate says no (dismissed, or onboarding active)', async () => {
    prompts.isFirstMowSheetDismissed.mockResolvedValue(true);
    prompts.shouldShowFirstMowSheet.mockReturnValue(false);
    const tree = await renderTimer();
    press(tree, 'Start');
    expect(sheetVisible(tree)).toBe(false);
    expect(prompts.dismissFirstMowSheet).not.toHaveBeenCalled();
  });
});

describe('MowTimerScreen — restore', () => {
  it('restores a PAUSED timer frozen (survives app kill)', async () => {
    const paused: TimerState = {
      segments: [{ startedAt: T0, endedAt: T0 + 300_000 }],
      runningSince: null,
    };
    timerStorage.loadTimerState.mockResolvedValue(paused);
    NOW = T0 + 999_000; // long after the kill

    const tree = await renderTimer();

    expect(labelText(tree)).toContain('Paused');
    expect(has(tree, 'Resume')).toBe(true);
    expect(labelText(tree)).toContain('00:05:00'); // frozen 5:00, independent of now
  });
});
