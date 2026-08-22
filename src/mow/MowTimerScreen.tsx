import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { propertyRepository } from './asyncStorageRepositories';
import type { RootStackParamList } from './navigation';
import {
  IDLE_TIMER,
  activeDurationSeconds,
  finalize,
  isPaused,
  isRunning as isTimerRunning,
  pause,
  resume,
  start as startTimer,
  type TimerState,
} from './mowSegments';
import {
  clearTimerState,
  loadTimerState,
  saveTimerState,
} from './timerStorage';
import { publishTimerCleared, publishTimerState } from './useInProgressTimer';
import {
  dismissFirstMowSheet,
  dismissOnboarding,
  hasLawn,
  isFirstMowSheetDismissed,
  isOnboardingDismissed,
  shouldShowFirstMowSheet,
  shouldShowOnboarding,
} from '../lawn/prompts';
import FirstMowSheet from './FirstMowSheet';
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
  // The whole timer state (segments + open interval) is the source of truth.
  const [timer, setTimer] = useState<TimerState>(IDLE_TIMER);
  // Bumped by the cosmetic interval purely to trigger re-renders.
  const [, setTick] = useState(0);
  // First-mow coaching sheet: shown on the first Start, but never stacked on the
  // lawn onboarding. The gate flags are loaded alongside onboarding below; the
  // ref defaults suppress the sheet until they load.
  const [firstMowSheetVisible, setFirstMowSheetVisible] = useState(false);
  const firstMowGateRef = useRef({ onboardingActive: true, firstMowSheetDismissed: true });
  const running = isTimerRunning(timer);
  const paused = isPaused(timer);
  const idle = !running && !paused;

  // On mount, restore an in-progress timer persisted before a crash/force-quit —
  // running (resumes its open interval) OR paused (frozen).
  useEffect(() => {
    let active = true;
    loadTimerState().then((restored) => {
      if (active && restored) {
        setTimer(restored);
        publishTimerState(restored); // keep the shared store (banner) in sync
      }
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
      const [property, dismissed, firstMowSheetDismissed] = await Promise.all([
        propertyRepository.getOrCreateDefault(),
        isOnboardingDismissed(),
        isFirstMowSheetDismissed(),
      ]);
      if (!active) return;
      const onboardingActive = shouldShowOnboarding({
        hasBoundary: hasLawn(property.zones),
        dismissed,
      });
      // Record the gate for the first-mow sheet so a first Start can decide
      // synchronously without re-hitting storage (and never stack on onboarding).
      firstMowGateRef.current = { onboardingActive, firstMowSheetDismissed };
      if (!onboardingActive) return;
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

  // Cosmetic 1s interval ONLY while running — so a paused timer's display is
  // frozen. All elapsed time is derived from timestamps, so a missed/killed
  // tick loses no time (D-011).
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  // Each transition updates state AND persists it, so a crash/kill restores the
  // exact running-or-paused state. Handlers read the current `timer` closure.
  const apply = (next: TimerState) => {
    setTimer(next);
    void saveTimerState(next);
    publishTimerState(next); // mirror into the shared store for the cross-tab banner
  };
  const handleStart = () => {
    apply(startTimer(Date.now()));
    const { onboardingActive, firstMowSheetDismissed } = firstMowGateRef.current;
    if (shouldShowFirstMowSheet({ onboardingActive, firstMowSheetDismissed })) {
      setFirstMowSheetVisible(true);
      firstMowGateRef.current.firstMowSheetDismissed = true; // never reshow this session
      void dismissFirstMowSheet(); // persist so it never returns
    }
  };
  const handlePause = () => apply(pause(timer, Date.now()));
  const handleResume = () => apply(resume(timer, Date.now()));

  const handleFinalize = () => {
    // Collapse the segments into a draft and hand it to Save (exactly as Stop
    // did): reset the UI and clear the persisted timer. Finalize is safe while
    // paused (no open interval to close).
    const draft = finalize(timer, Date.now());
    setTimer(IDLE_TIMER);
    void clearTimerState();
    publishTimerCleared();
    navigation.navigate('SaveMow', { draft });
  };

  const elapsedSeconds = activeDurationSeconds(timer, Date.now());
  const label = running ? 'Mowing' : paused ? 'Paused' : 'Ready to mow';

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.time} accessibilityLabel={`Elapsed ${formatElapsed(elapsedSeconds)}`}>
        {formatElapsed(elapsedSeconds)}
      </Text>

      {idle ? (
        <Pressable
          onPress={handleStart}
          style={({ pressed }) => [styles.button, styles.start, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Start"
        >
          <Text style={styles.buttonText}>Start</Text>
        </Pressable>
      ) : (
        <View style={styles.controls}>
          {/* The green button toggles momentum (Pause/Resume); Finalize (outline)
              ends the mow into the save flow and is available in both states. */}
          <Pressable
            onPress={running ? handlePause : handleResume}
            style={({ pressed }) => [styles.button, styles.start, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={running ? 'Pause' : 'Resume'}
          >
            <Text style={styles.buttonText}>{running ? 'Pause' : 'Resume'}</Text>
          </Pressable>
          <Pressable
            onPress={handleFinalize}
            style={({ pressed }) => [styles.button, styles.secondary, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Finalize"
          >
            <Text style={[styles.buttonText, styles.secondaryText]}>Finalize</Text>
          </Pressable>
        </View>
      )}

      {idle && (
        <View style={styles.links}>
          <Pressable
            onPress={() => navigation.navigate('Tabs', { screen: 'Stats' })}
            style={({ pressed }) => pressed && styles.pressed}
            accessibilityRole="button"
          >
            <Text style={styles.link}>Stats</Text>
          </Pressable>
        </View>
      )}

      <FirstMowSheet
        visible={firstMowSheetVisible}
        onDismiss={() => setFirstMowSheetVisible(false)}
      />
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
    paddingHorizontal: spacing.xxl,
    borderRadius: radii.pill,
  },
  start: { backgroundColor: colors.primary },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: { color: colors.ink },
  controls: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'center',
  },
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
