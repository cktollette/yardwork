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
          placeholderTextColor="#9ca3af"
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
    padding: 24,
    gap: 24,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  fieldValue: {
    fontSize: 20,
    color: '#111827',
  },
  duration: {
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  notesInput: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  button: {
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
  },
  save: {
    backgroundColor: '#16a34a',
  },
  saveText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  discardText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.8,
  },
});
