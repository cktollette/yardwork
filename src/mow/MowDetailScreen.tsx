import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Button from '../components/Button';
import { mowRepository } from './asyncStorageRepositories';
import { formatDateField, formatTimeField, parseDateTimeField } from './datetimeField';
import { formatMowDate } from './format';
import type { MowEdit } from './editMow';
import type { Mow } from './models';
import type { RootStackScreenProps } from './navigation';
import { colors, radii, spacing, typography } from '../theme';

type Props = RootStackScreenProps<'MowDetail'>;

/**
 * Edit or delete a single logged mow. Date and time are plain text fields
 * (YYYY-MM-DD / HH:MM — no native picker, a v0 choice); duration is whole
 * minutes. Only fields the user actually changes are sent in the patch, so a
 * date-only edit preserves the stored durationSeconds exactly. All persistence
 * goes through the repository — never AsyncStorage directly.
 */
export default function MowDetailScreen({ navigation, route }: Props) {
  const { mowId } = route.params;

  const [mow, setMow] = useState<Mow | null | undefined>(undefined);
  const [dateField, setDateField] = useState('');
  const [timeField, setTimeField] = useState('');
  const [minutesField, setMinutesField] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    mowRepository.getMowById(mowId).then((loaded) => {
      if (!active) return;
      setMow(loaded);
      if (loaded) {
        // Title the screen with the mow's date instead of a generic label.
        navigation.setOptions({ title: formatMowDate(loaded.startedAt) });
        setDateField(formatDateField(loaded.startedAt));
        setTimeField(formatTimeField(loaded.startedAt));
        setMinutesField(String(Math.round(loaded.durationSeconds / 60)));
        setNotes(loaded.notes ?? '');
      }
    });
    return () => {
      active = false;
    };
  }, [mowId, navigation]);

  const handleSave = useCallback(async () => {
    if (!mow || busy) return;

    // Compare against the loaded values so unchanged fields stay out of the
    // patch (a date-only edit must not round the stored duration).
    const patch: MowEdit = {};

    const dateTouched =
      dateField !== formatDateField(mow.startedAt) ||
      timeField !== formatTimeField(mow.startedAt);
    if (dateTouched) {
      const parsed = parseDateTimeField(dateField.trim(), timeField.trim());
      if (parsed === null) {
        Alert.alert('Check the date', 'Use YYYY-MM-DD and HH:MM (24-hour).');
        return;
      }
      patch.startedAt = parsed;
    }

    if (minutesField !== String(Math.round(mow.durationSeconds / 60))) {
      const minutes = Number(minutesField.trim());
      if (!Number.isFinite(minutes) || minutes <= 0) {
        Alert.alert('Check the duration', 'Enter a number of minutes greater than zero.');
        return;
      }
      patch.durationSeconds = Math.round(minutes * 60);
    }

    if (notes !== (mow.notes ?? '')) {
      patch.notes = notes;
    }

    if (Object.keys(patch).length === 0) {
      navigation.goBack(); // nothing changed
      return;
    }

    setBusy(true);
    try {
      await mowRepository.update(mow.id, patch);
      navigation.goBack();
    } catch {
      setBusy(false);
      Alert.alert("Couldn't save changes", 'Please check the values and try again.');
    }
  }, [mow, busy, dateField, timeField, minutesField, notes, navigation]);

  const handleDelete = useCallback(() => {
    if (!mow || busy) return;
    Alert.alert('Delete this mow?', 'This permanently removes it from your log.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await mowRepository.delete(mow.id);
            navigation.goBack();
          } catch {
            setBusy(false);
            Alert.alert("Couldn't delete this mow", 'Please try again.');
          }
        },
      },
    ]);
  }, [mow, busy, navigation]);

  if (mow === undefined) return <View style={styles.container} />;

  if (mow === null) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.gone}>This mow is no longer in your log.</Text>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button">
          <Text style={styles.backLink}>Back to log</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Date</Text>
        <TextInput
          style={styles.input}
          value={dateField}
          onChangeText={setDateField}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          editable={!busy}
          accessibilityLabel="Mow date"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Time</Text>
        <TextInput
          style={styles.input}
          value={timeField}
          onChangeText={setTimeField}
          placeholder="HH:MM"
          placeholderTextColor={colors.textMuted}
          editable={!busy}
          accessibilityLabel="Mow start time"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Duration (minutes)</Text>
        <TextInput
          style={styles.input}
          value={minutesField}
          onChangeText={setMinutesField}
          keyboardType="number-pad"
          placeholder="e.g. 40"
          placeholderTextColor={colors.textMuted}
          editable={!busy}
          accessibilityLabel="Mow duration in minutes"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder="How did it go?"
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
          editable={!busy}
          accessibilityLabel="Mow notes"
        />
      </View>

      <Button
        label={busy ? 'Saving…' : 'Save changes'}
        variant="primary"
        fullWidth
        disabled={busy}
        onPress={handleSave}
      />

      <Pressable
        onPress={handleDelete}
        disabled={busy}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        accessibilityRole="button"
      >
        <Text style={styles.deleteText}>Delete mow</Text>
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
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  gone: { fontSize: typography.body, color: colors.textSecondary, textAlign: 'center' },
  backLink: { fontSize: typography.body, color: colors.primary, fontWeight: '600' },
  field: { gap: spacing.sm },
  fieldLabel: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    fontSize: typography.body,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  notesInput: { minHeight: 96 },
  button: {
    paddingVertical: spacing.lg,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  deleteText: { color: colors.destructive, fontSize: typography.body, fontWeight: '600' },
  pressed: { opacity: 0.8 },
});
