import Mapbox from '@rnmapbox/maps';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import EquipmentFormScreen from './src/equipment/EquipmentFormScreen';
import GarageScreen from './src/equipment/GarageScreen';
import LawnDrawScreen from './src/lawn/LawnDrawScreen';
import MowDetailScreen from './src/mow/MowDetailScreen';
import MowTimerScreen from './src/mow/MowTimerScreen';
import type { RootStackParamList } from './src/mow/navigation';
import SaveMowScreen from './src/mow/SaveMowScreen';
import RootTabs from './src/navigation/RootTabs';

// Set the Mapbox public access token once at app start, before any MapView
// renders. Loaded from the env; null when unset so no token is baked in.
Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? null);

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
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
