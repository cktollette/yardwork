import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { propertyRepository } from './asyncStorageRepositories';
import type { RootStackParamList } from './navigation';
import { buildDraftMow, computeElapsedSeconds } from './timer';
import {
  clearRunningTimer,
  loadRunningTimer,
  saveRunningTimer,
} from './timerStorage';
import {
  dismissOnboarding,
  hasLawn,
  isOnboardingDismissed,
  shouldShowOnboarding,
} from '../lawn/prompts';
import { colors, radii, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Timer'>;

/** Format whole seconds as HH:MM:SS. */
function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function MowTimerScreen({ navigation }: Props) {
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

  // First-launch onboarding: offer to trace the lawn. Skippable, and once the
  // user draws one or taps Skip it never shows again (D-002 — optional polygon).
  useEffect(() => {
    let active = true;
    (async () => {
      const [property, dismissed] = await Promise.all([
        propertyRepository.getOrCreateDefault(),
        isOnboardingDismissed(),
      ]);
      if (!active) return;
      if (
        !shouldShowOnboarding({
          hasBoundary: hasLawn(property.boundary),
          dismissed,
        })
      ) {
        return;
      }
      Alert.alert(
        'Welcome to Yardwork',
        'Trace your lawn to unlock area and efficiency stats. You can always do this later from Stats.',
        [
          {
            text: 'Skip',
            style: 'cancel',
            onPress: () => {
              void dismissOnboarding();
            },
          },
          {
            text: 'Draw my lawn',
            onPress: () => {
              void dismissOnboarding();
              navigation.navigate('LawnDraw', {
                propertyId: property.id,
                mode: 'create',
              });
            },
          },
        ],
      );
    })();
    return () => {
      active = false;
    };
  }, [navigation]);

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
    // The mow is done: reset the UI and clear the persisted running timer, then
    // hand the draft to the Save Mow screen, which persists it (or discards).
    setStartedAt(null);
    void clearRunningTimer();
    navigation.navigate('SaveMow', { draft });
  }, [startedAt, navigation]);

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
      {!isRunning && (
        <View style={styles.links}>
          <Pressable
            onPress={() => navigation.navigate('MowList')}
            style={({ pressed }) => pressed && styles.pressed}
            accessibilityRole="button"
          >
            <Text style={styles.link}>View log</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('Stats')}
            style={({ pressed }) => pressed && styles.pressed}
            accessibilityRole="button"
          >
            <Text style={styles.link}>Stats</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxl,
  },
  label: {
    fontSize: typography.title,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  time: {
    fontSize: typography.display,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
    color: colors.ink,
  },
  button: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl * 2,
    borderRadius: radii.pill,
  },
  start: { backgroundColor: colors.primary },
  stop: { backgroundColor: colors.destructive },
  pressed: { opacity: 0.8 },
  buttonText: {
    color: colors.textOnColor,
    fontSize: typography.heading,
    fontWeight: '600',
  },
  links: {
    flexDirection: 'row',
    gap: spacing.xxl,
  },
  link: {
    fontSize: typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});
