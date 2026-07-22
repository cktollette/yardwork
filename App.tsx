import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MowListScreen from './src/mow/MowListScreen';
import MowTimerScreen from './src/mow/MowTimerScreen';
import type { RootStackParamList } from './src/mow/navigation';
import SaveMowScreen from './src/mow/SaveMowScreen';
import StatsScreen from './src/stats/StatsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="Timer"
            component={MowTimerScreen}
            options={{ title: 'Yardwork' }}
          />
          <Stack.Screen
            name="SaveMow"
            component={SaveMowScreen}
            options={{ title: 'Save Mow' }}
          />
          <Stack.Screen
            name="MowList"
            component={MowListScreen}
            options={{ title: 'Mow Log' }}
          />
          <Stack.Screen
            name="Stats"
            component={StatsScreen}
            options={{ title: 'Stats' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
