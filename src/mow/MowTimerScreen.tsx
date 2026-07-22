import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { buildDraftMow, computeElapsedSeconds } from './timer';
import { saveDraftMow } from './saveDraftMow';
import {
  clearRunningTimer,
  loadRunningTimer,
  saveRunningTimer,
} from './timerStorage';

/** Format whole seconds as HH:MM:SS. */
function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function MowTimerScreen() {
  // `startedAt` is the single source of truth: null = idle, number = running.
  const [startedAt, setStartedAt] = useState<number | null>(null);
  // Bumped by the cosmetic interval purely to trigger re-renders.
  const [, setTick] = useState(0);
  const isRunning = startedAt !== null;

  // On mount, restore an in-progress timer persisted before a crash/force-quit.
  useEffect(() => {
    let active = true;
    loadRunningTimer().then((restored) => {
      if (active && restored !== null) setStartedAt(restored);
    });
    return () => {
      active = false;
    };
  }, []);

  // Cosmetic 1s interval while running. It ONLY forces a re-render; all elapsed
  // time is derived from `startedAt`, so a missed/killed tick loses no time.
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  const handleStart = useCallback(() => {
    const now = Date.now();
    setStartedAt(now);
    void saveRunningTimer(now);
  }, []);

  const handleStop = useCallback(() => {
    if (startedAt === null) return;
    const draft = buildDraftMow(startedAt, Date.now());
    saveDraftMow(draft);
    setStartedAt(null);
    void clearRunningTimer();
  }, [startedAt]);

  const elapsedSeconds = isRunning
    ? computeElapsedSeconds(startedAt, Date.now())
    : 0;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{isRunning ? 'Mowing' : 'Ready to mow'}</Text>
      <Text style={styles.time} accessibilityLabel={`Elapsed ${formatElapsed(elapsedSeconds)}`}>
        {formatElapsed(elapsedSeconds)}
      </Text>
      <Pressable
        onPress={isRunning ? handleStop : handleStart}
        style={({ pressed }) => [
          styles.button,
          isRunning ? styles.stop : styles.start,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>{isRunning ? 'Stop' : 'Start'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  label: {
    fontSize: 18,
    color: '#4b5563',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  time: {
    fontSize: 72,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
    color: '#111827',
  },
  button: {
    paddingVertical: 18,
    paddingHorizontal: 64,
    borderRadius: 999,
  },
  start: { backgroundColor: '#16a34a' },
  stop: { backgroundColor: '#dc2626' },
  pressed: { opacity: 0.8 },
  buttonText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
  },
});
