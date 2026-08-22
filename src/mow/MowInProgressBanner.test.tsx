import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { IDLE_TIMER, pause, start, type TimerState } from './mowSegments';
import MowInProgressBanner from './MowInProgressBanner';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('./timerStorage', () => ({ clearTimerState: jest.fn() }));
jest.mock('./useInProgressTimer', () => ({
  useInProgressTimer: jest.fn(),
  publishTimerCleared: jest.fn(),
}));

import { clearTimerState } from './timerStorage';
import { publishTimerCleared, useInProgressTimer } from './useInProgressTimer';

const useTimer = useInProgressTimer as jest.Mock;
const T0 = 1_700_000_000_000;
let NOW = T0;

function render(): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<MowInProgressBanner />);
  });
  return tree;
}
const json = (t: ReactTestRenderer) => JSON.stringify(t.toJSON());
function press(t: ReactTestRenderer, label: string): void {
  act(() => {
    t.root.findByProps({ accessibilityLabel: label }).props.onPress();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ doNotFake: ['Date'] });
  jest.spyOn(Date, 'now').mockImplementation(() => NOW);
  NOW = T0;
});
afterEach(() => {
  jest.useRealTimers();
});

it('renders nothing until loaded, or when idle', () => {
  useTimer.mockReturnValue({ loaded: false, state: IDLE_TIMER });
  expect(render().toJSON()).toBeNull();

  useTimer.mockReturnValue({ loaded: true, state: IDLE_TIMER });
  expect(render().toJSON()).toBeNull();
});

it('shows elapsed + "Mowing" while running', () => {
  NOW = T0 + 65_000; // 1m05s of active time
  useTimer.mockReturnValue({ loaded: true, state: start(T0) });
  const t = render();
  expect(json(t)).toContain('Mowing');
  expect(json(t)).toContain('00:01:05');
  expect(json(t)).not.toContain('Paused');
});

it('shows "Paused" and a frozen elapsed while paused', () => {
  const paused = pause(start(T0), T0 + 300_000); // 5m active then paused
  NOW = T0 + 999_000; // time moves on; paused elapsed stays frozen
  useTimer.mockReturnValue({ loaded: true, state: paused });
  const t = render();
  expect(json(t)).toContain('Paused');
  expect(json(t)).toContain('00:05:00');
});

it('Finish finalizes into SaveMow and clears the timer', () => {
  NOW = T0 + 65_000;
  const running: TimerState = start(T0);
  useTimer.mockReturnValue({ loaded: true, state: running });
  const t = render();

  press(t, 'Finish mow');

  expect(clearTimerState).toHaveBeenCalled();
  expect(publishTimerCleared).toHaveBeenCalled();
  expect(mockNavigate).toHaveBeenCalledWith('SaveMow', {
    draft: { startedAt: T0, endedAt: T0 + 65_000, durationSeconds: 65 },
  });
});

it('tapping the bar reopens the Timer', () => {
  useTimer.mockReturnValue({ loaded: true, state: start(T0) });
  const t = render();
  press(t, 'Open the mow in progress');
  expect(mockNavigate).toHaveBeenCalledWith('Timer');
});
