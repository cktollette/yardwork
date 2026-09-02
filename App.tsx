import Mapbox from '@rnmapbox/maps';
import { NavigationContainer, type InitialState } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import EquipmentFormScreen from './src/equipment/EquipmentFormScreen';
import GarageScreen from './src/equipment/GarageScreen';
import LawnDrawScreen from './src/lawn/LawnDrawScreen';
import MowDetailScreen from './src/mow/MowDetailScreen';
import MowTimerScreen from './src/mow/MowTimerScreen';
import type { RootStackParamList } from './src/mow/navigation';
import SaveMowScreen from './src/mow/SaveMowScreen';
import { shouldResumeTimer, useInProgressTimer } from './src/mow/useInProgressTimer';
import RootTabs from './src/navigation/RootTabs';
import StatsScreen from './src/stats/StatsScreen';
import { colors } from './src/theme';

// Set the Mapbox public access token once at app start, before any MapView
// renders. Loaded from the env; null when unset so no token is baked in.
Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? null);
// Opt out of Mapbox's usage telemetry (event collection). App-init scope,
// alongside the token so it's set before any MapView renders.
Mapbox.setTelemetryEnabled(false);

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  // Resolve any in-progress mow BEFORE the navigator mounts, so a resumed timer
  // opens directly on the Timer screen with no flash of Home first (item 3). The
  // read is a fast AsyncStorage hit; until it lands we render a bare themed
  // background rather than the navigator.
  const timer = useInProgressTimer();
  if (!timer.loaded) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: colors.background }} />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    );
  }

  // Resume: seed the stack as [Tabs, Timer] so the Timer screen is on top but a
  // back gesture still returns to the tabs. Idle: default (Tabs).
  const initialState: InitialState | undefined = shouldResumeTimer(timer.state)
    ? { index: 1, routes: [{ name: 'Tabs' }, { name: 'Timer' }] }
    : undefined;

  return (
    <SafeAreaProvider>
      <NavigationContainer initialState={initialState}>
        {/* Root stack: the tabs are the base screen; the mow flow and the
            full-screen lawn editor push ABOVE the tabs, covering the tab bar.
            headerBackButtonDisplayMode "minimal" => chevron-only back buttons,
            so pushed screens don't inherit a stale text label. */}
        <Stack.Navigator
          screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}
        >
          <Stack.Screen
            name="Tabs"
            component={RootTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Timer"
            component={MowTimerScreen}
            options={{ title: 'Mow Timer' }}
          />
          <Stack.Screen
            name="Statistics"
            component={StatsScreen}
            options={{ title: 'Statistics' }}
          />
          <Stack.Screen
            name="SaveMow"
            component={SaveMowScreen}
            options={{ title: 'Save Mow' }}
          />
          <Stack.Screen
            name="MowDetail"
            component={MowDetailScreen}
            options={{ title: 'Mow' }}
          />
          <Stack.Screen
            name="LawnDraw"
            component={LawnDrawScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Garage"
            component={GarageScreen}
            options={{ title: 'Garage' }}
          />
          <Stack.Screen
            name="EquipmentForm"
            component={EquipmentFormScreen}
            options={{ title: 'Equipment' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
