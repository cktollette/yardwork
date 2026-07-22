import { StatusBar } from 'expo-status-bar';
import MowTimerScreen from './src/mow/MowTimerScreen';

export default function App() {
  return (
    <>
      <MowTimerScreen />
      <StatusBar style="auto" />
    </>
  );
}
