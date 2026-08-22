import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { activeDurationSeconds, finalize, isRunning, isPaused } from './mowSegments';
import type { RootStackParamList } from './navigation';
import { clearTimerState } from './timerStorage';
import { publishTimerCleared, useInProgressTimer } from './useInProgressTimer';
import { colors, radii, spacing, typography } from '../theme';

/** Height of the bottom tab bar this floats above (default RN tab bar). */
const TAB_BAR_HEIGHT = 49;

/** HH:MM:SS from whole seconds. */
function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/**
 * A slim bar pinned just above the tab bar, shown on EVERY tab while a mow is in
 * progress (running or paused). It reads the shared in-progress store, so it
 * reflects the live timer and is cleared only by Finalize. Tapping the bar
 * reopens the Timer; "Finish" ends the mow into the save flow from anywhere.
 */
export default function MowInProgressBanner() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { loaded, state } = useInProgressTimer();
  const insets = useSafeAreaInsets();
  const [, setTick] = useState(0);

  const running = isRunning(state);
  const paused = isPaused(state);
  const visible = loaded && (running || paused);

  // Tick once a second only while running, so the elapsed display advances; a
  // paused bar is static (elapsed is derived from timestamps, D-011).
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  if (!visible) return null;

  const elapsed = formatElapsed(activeDurationSeconds(state, Date.now()));

  const onFinish = () => {
    const draft = finalize(state, Date.now());
    void clearTimerState();
    publishTimerCleared();
    navigation.navigate('SaveMow', { draft });
  };

  return (
    <Pressable
      onPress={() => navigation.navigate('Timer')}
      accessibilityRole="button"
      accessibilityLabel="Open the mow in progress"
      style={[styles.bar, { bottom: TAB_BAR_HEIGHT + insets.bottom }]}
    >
      <View style={styles.left}>
        <View style={[styles.pip, paused ? styles.pipPaused : styles.pipLive]} />
        <Text style={styles.status}>{paused ? 'Paused' : 'Mowing'}</Text>
        <Text style={styles.elapsed} accessibilityLabel={`Elapsed ${elapsed}`}>
          {elapsed}
        </Text>
      </View>
      <Pressable
        onPress={onFinish}
        accessibilityRole="button"
        accessibilityLabel="Finish mow"
        hitSlop={8}
        style={({ pressed }) => [styles.finish, pressed && styles.finishPressed]}
      >
        <Text style={styles.finishText}>Finish</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.ink,
    borderRadius: radii.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pip: { width: 8, height: 8, borderRadius: 4 },
  pipLive: { backgroundColor: colors.primary },
  pipPaused: { backgroundColor: colors.primaryMuted },
  status: {
    color: colors.textOnColor,
    fontSize: typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  elapsed: {
    color: colors.textOnColor,
    fontSize: typography.body,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  finish: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  finishPressed: { backgroundColor: colors.primaryMuted },
  finishText: {
    color: colors.textOnColor,
    fontSize: typography.caption,
    fontWeight: '700',
  },
});
