import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import RootTabs from './RootTabs';

// The Lawn and Stats tabs reach the repository (AsyncStorage) on mount. Use the
// in-memory mock shipped with the package, same as the repository tests.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Fixed metrics so SafeAreaProvider resolves synchronously (no async measure).
const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const Stack = createNativeStackNavigator();

// RootTabs reads the root (stack) navigation for its center button, so it must
// be mounted as a stack screen — mirror the real App shell.
function harness() {
  return (
    <SafeAreaProvider initialMetrics={METRICS}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="Tabs"
            component={RootTabs}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

describe('RootTabs', () => {
  it('renders the tab bar with the Home screen and center Mow action', async () => {
    let tree!: ReactTestRenderer;
    await act(async () => {
      tree = create(harness());
    });
    const json = JSON.stringify(tree.toJSON());
    // Home is the initial tab. With no mows (empty mock storage) it shows the
    // cold-start welcome.
    expect(json).toContain('Welcome to Klippa');
    // The center action button.
    expect(json).toContain('MOW');
    // Tab labels present, including the new Log tab.
    expect(json).toContain('Stats');
    expect(json).toContain('Log');
    expect(json).toContain('Lawn');
  });
});
