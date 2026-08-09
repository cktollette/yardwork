import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { mowRepository, propertyRepository } from './asyncStorageRepositories';
import { formatDuration, formatMowDate } from './format';
import type { RootStackParamList } from './navigation';
import {
  dismissThirdMowPrompt,
  hasLawn,
  isThirdMowPromptDismissed,
  shouldPromptAfterMow,
} from '../lawn/prompts';
import { colors, radii, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'SaveMow'>;

/**
 * Shown when the timer stops. Date and duration are pre-filled and read-only;
 * the only input is an optional note. Save persists via the repository (auto-
 * creating the default Property) and lands on the list; Discard drops the mow.
 */
export default function SaveMowScreen({ navigation, route }: Props) {
  const { draft } = route.params;
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      // Every mow needs a Property (D-005); create the default on first save.
      const property = await propertyRepository.getOrCreateDefault();
      const trimmed = notes.trim();
      await mowRepository.saveMow({
        propertyId: property.id,
        startedAt: draft.startedAt,
        endedAt: draft.endedAt,
        durationSeconds: draft.durationSeconds,
        ...(trimmed ? { notes: trimmed } : {}),
      });

      // Once they've logged a few mows but still have no lawn, nudge them once
      // to trace it (unlocks area/efficiency stats). Skippable, shown at most
      // once — dismissing it here means it never returns.
      const [mows, dismissed] = await Promise.all([
        mowRepository.listMows(),
        isThirdMowPromptDismissed(),
      ]);
      if (
        shouldPromptAfterMow({
          mowCount: mows.length,
          hasBoundary: hasLawn(property.boundary),
          dismissed,
        })
      ) {
        await dismissThirdMowPrompt();
        Alert.alert(
          'Trace your lawn?',
          'Trace your lawn once to unlock area and efficiency stats.',
          [
            {
              text: 'Not now',
              style: 'cancel',
              onPress: () => navigation.replace('MowList'),
            },
            {
              text: 'Trace lawn',
              onPress: () =>
                navigation.replace('LawnDraw', {
                  propertyId: property.id,
                  mode: 'create',
                }),
            },
          ],
        );
        return;
      }

      // replace() so Back from the list returns to the timer, not here.
      navigation.replace('MowList');
    } catch {
      setSaving(false);
      Alert.alert('Could not save mow', 'Please try again.');
    }
  }, [saving, notes, draft, navigation]);

  const handleDiscard = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Date</Text>
        <Text style={styles.fieldValue}>{formatMowDate(draft.startedAt)}</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Duration</Text>
        <Text style={[styles.fieldValue, styles.duration]}>
          {formatDuration(draft.durationSeconds)}
        </Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Notes (optional)</Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="How did it go?"
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
          editable={!saving}
          accessibilityLabel="Mow notes"
        />
      </View>

      <Pressable
        onPress={handleSave}
        disabled={saving}
        style={({ pressed }) => [
          styles.button,
          styles.save,
          (pressed || saving) && styles.pressed,
        ]}
        accessibilityRole="button"
      >
        <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save'}</Text>
      </Pressable>

      <Pressable
        onPress={handleDiscard}
        disabled={saving}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        accessibilityRole="button"
      >
        <Text style={styles.discardText}>Discard</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    gap: spacing.xl,
    backgroundColor: colors.cream,
    flexGrow: 1,
  },
  field: {
    gap: spacing.sm,
  },
  fieldLabel: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  fieldValue: {
    fontSize: typography.titleLarge,
    color: colors.ink,
  },
  duration: {
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  notesInput: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    fontSize: typography.body,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  button: {
    paddingVertical: spacing.lg,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  save: {
    backgroundColor: colors.primary,
  },
  saveText: {
    color: colors.textOnColor,
    fontSize: typography.title,
    fontWeight: '600',
  },
  discardText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.8,
  },
});
