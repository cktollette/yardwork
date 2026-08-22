import {
  createNavigationContainerRef,
  NavigationContainer,
  type InitialState,
  type NavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { pause, start } from './mowSegments';
import { saveTimerState } from './timerStorage';
import {
  __resetInProgressTimerStoreForTests,
  shouldResumeTimer,
  useInProgressTimer,
} from './useInProgressTimer';

/**
 * Cold-launch routing (item 3), end-to-end through the REAL store + REAL
 * timerStorage against the in-memory AsyncStorage. This is the automated stand-in
 * for on-device smoke step 2 (start -> pause -> kill -> relaunch -> Timer): the
 * simulator's dev-client needs a manual tap to connect that can't be injected
 * headlessly, so the gate is exercised here instead. It reproduces the App gate
 * exactly: render nothing routable until the timer load resolves (no Home flash),
 * then seed the stack to [Tabs, Timer] when resuming so Timer is focused but back
 * still returns to the tabs.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
import AsyncStorage from '@react-native-async-storage/async-storage';

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const T0 = 1_700_000_000_000;
type GateParams = { Tabs: undefined; Timer: undefined };
const Stack = createNativeStackNavigator<GateParams>();
const makeRef = () => createNavigationContainerRef<GateParams>();

// Mirrors App.tsx's gate. Stub screens stand in for Tabs/Timer so the test needs
// no Mapbox/native deps.
function AppGate({ navRef }: { navRef: NavigationContainerRef<GateParams> }) {
  const timer = useInProgressTimer();
  if (!timer.loaded) return <Text>LOADING</Text>;
  const initialState: InitialState | undefined = shouldResumeTimer(timer.state)
    ? { index: 1, routes: [{ name: 'Tabs' }, { name: 'Timer' }] }
    : undefined;
  return (
    <SafeAreaProvider initialMetrics={METRICS}>
      <NavigationContainer ref={navRef as never} initialState={initialState}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Tabs">{() => <Text>TABS_SCREEN</Text>}</Stack.Screen>
          <Stack.Screen name="Timer">{() => <Text>TIMER_SCREEN</Text>}</Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
  __resetInProgressTimerStoreForTests();
});

it('cold launch with a persisted PAUSED mow opens on Timer (no Home flash)', async () => {
  // start -> pause -> (kill): the persisted state a relaunch would find.
  await saveTimerState(pause(start(T0), T0 + 300_000));

  const navRef = makeRef();
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<AppGate navRef={navRef} />);
  });
  // Before the load resolves the gate shows LOADING, never a routable screen.
  expect(JSON.stringify(tree.toJSON())).toContain('LOADING');

  await act(async () => {}); // resolve hydrate + mount navigator

  expect(navRef.getCurrentRoute()?.name).toBe('Timer'); // focused screen is Timer
  expect(JSON.stringify(tree.toJSON())).toContain('TIMER_SCREEN');
});

it('cold launch with a RUNNING mow also opens on Timer', async () => {
  await saveTimerState(start(T0));
  const navRef = makeRef();
  act(() => {
    create(<AppGate navRef={navRef} />);
  });
  await act(async () => {});
  expect(navRef.getCurrentRoute()?.name).toBe('Timer');
});

it('cold launch with no in-progress mow lands on Tabs', async () => {
  const navRef = makeRef();
  act(() => {
    create(<AppGate navRef={navRef} />);
  });
  await act(async () => {});
  expect(navRef.getCurrentRoute()?.name).toBe('Tabs');
});

it('resolves to Tabs and dev-logs when the timer load rejects (never stuck on LOADING)', async () => {
  // loadTimerState is built never to throw; if it ever did, the gate must still
  // resolve rather than hang on the pre-navigator loading screen.
  const timerStorage = require('./timerStorage');
  const loadSpy = jest
    .spyOn(timerStorage, 'loadTimerState')
    .mockRejectedValue(new Error('boom'));
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

  const navRef = makeRef();
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<AppGate navRef={navRef} />);
  });
  expect(JSON.stringify(tree.toJSON())).toContain('LOADING');

  await act(async () => {});
  await act(async () => {}); // flush the rejection + catch + emit

  expect(JSON.stringify(tree.toJSON())).not.toContain('LOADING');
  expect(navRef.getCurrentRoute()?.name).toBe('Tabs');
  expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[timer]'));

  loadSpy.mockRestore();
  warnSpy.mockRestore();
});
