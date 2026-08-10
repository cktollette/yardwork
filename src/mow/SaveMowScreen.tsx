import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
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
import { equipmentRepository } from '../equipment/asyncStorageRepositories';
import EquipmentChips from '../equipment/EquipmentChips';
import type { Equipment } from '../equipment/models';
import { mowRepository, propertyRepository } from './asyncStorageRepositories';
import { formatDuration, formatMowDate } from './format';
import HocField from './HocField';
import { mostRecentHoc } from './hoc';
import { seedToolSelection } from './tools';
import type { RootStackScreenProps } from './navigation';
import {
  dismissThirdMowPrompt,
  hasLawn,
  isThirdMowPromptDismissed,
  shouldPromptAfterMow,
} from '../lawn/prompts';
import { colors, radii, spacing, typography } from '../theme';

type Props = RootStackScreenProps<'SaveMow'>;

/**
 * Shown when the timer stops. Date and duration are pre-filled and read-only;
 * the only input is an optional note. Save persists via the repository (auto-
 * creating the default Property) and lands on the list; Discard drops the mow.
 */
export default function SaveMowScreen({ navigation, route }: Props) {
  const { draft } = route.params;
  const [notes, setNotes] = useState('');
  const [hocInches, setHocInches] = useState<number | undefined>(undefined);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  // Seed HOC + tool selection exactly once; later focuses (e.g. after adding
  // equipment via the empty-garage link) just refresh the chip list without
  // clobbering what the user has already toggled.
  const seededRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([mowRepository.listMows(), equipmentRepository.list()]).then(
        ([mows, garage]) => {
          if (!active) return;
          setEquipment(garage);
          if (!seededRef.current) {
            // Progressive disclosure: default from the most recent mow (D-025 for
            // HOC; D-039 for tools, filtered to still-existing garage).
            setHocInches(mostRecentHoc(mows));
            setSelectedIds(seedToolSelection(mows, garage));
            seededRef.current = true;
          }
        },
      );
      return () => {
        active = false;
      };
    }, []),
  );

  const toggleTool = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

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
        ...(hocInches != null ? { hocInches } : {}),
        ...(selectedIds.length ? { equipmentIds: selectedIds } : {}),
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
              onPress: () => navigation.navigate('Tabs', { screen: 'Log' }),
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

      // End the mow flow: pop back to the tabs and land on the Log tab.
      navigation.navigate('Tabs', { screen: 'Log' });
    } catch {
      setSaving(false);
      Alert.alert('Could not save mow', 'Please try again.');
    }
  }, [saving, notes, hocInches, selectedIds, draft, navigation]);

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

      <HocField value={hocInches} onChange={setHocInches} disabled={saving} />

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Tools (optional)</Text>
        {equipment.length > 0 ? (
          <EquipmentChips
            equipment={equipment}
            selectedIds={selectedIds}
            onToggle={toggleTool}
            disabled={saving}
            accessibilityLabel="Tools used"
          />
        ) : (
          <Pressable
            onPress={() => navigation.navigate('Garage')}
            accessibilityRole="button"
          >
            <Text style={styles.addEquipmentLink}>Add your equipment</Text>
          </Pressable>
        )}
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

      <Button
        label={saving ? 'Saving…' : 'Save'}
        variant="primary"
        fullWidth
        disabled={saving}
        onPress={handleSave}
      />

      <Button
        label="Discard"
        variant="pill"
        fullWidth
        disabled={saving}
        onPress={handleDiscard}
      />
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
  addEquipmentLink: {
    fontSize: typography.body,
    color: colors.primary,
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
});
