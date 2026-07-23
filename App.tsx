import Mapbox from '@rnmapbox/maps';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import PolygonDrawSpike from './src/lawn/PolygonDrawSpike';

// Set the Mapbox public access token at app start, before any MapView renders.
// Loaded from the env; null when unset so no token is baked into the source.
Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? null);

// SPIKE: render the polygon-draw screen directly as the app root. The real
// navigation + onboarding entry points come with the full feature (Step 2);
// the timer/log/stats nav stack from `main` is restored then.
export default function App() {
  return (
    <SafeAreaProvider>
      <PolygonDrawSpike />
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
