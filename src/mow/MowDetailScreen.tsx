import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerChangeEvent,
} from '@react-native-community/datetimepicker';
import Button from '../components/Button';
import type { EquipmentType } from '../equipment/models';
import { mowRepository, propertyRepository } from './asyncStorageRepositories';
import { formatDateField, formatTimeField, parseDateTimeField } from './datetimeField';
import { formatMowDate } from './format';
import HocField from './HocField';
import BagsField from './BagsField';
import ToolTypePicker from './ToolTypePicker';
import PhotoSlots, { type PhotoSlot } from './PhotoSlots';
import ZonePicker, { type PickerZone } from './ZonePicker';
import type { MowEdit } from './editMow';
import type { Mow } from './models';
import type { RootStackScreenProps } from './navigation';
import { colors, radii, spacing, typography } from '../theme';

/** Order-insensitive equality for two type lists. */
function sameTypes(a: EquipmentType[], b: EquipmentType[]): boolean {
  return a.length === b.length && a.every((t) => b.includes(t));
}

/** Whole number with thousands separators, engine-independent (no Intl). */
function formatThousands(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

type Props = RootStackScreenProps<'MowDetail'>;

/**
 * Edit or delete a single logged mow. Date and time use native pickers; duration
 * is whole minutes. The pickers write back into the same 'YYYY-MM-DD' / 'HH:MM'
 * string state the old text fields used, so the save path (parseDateTimeField)
 * and stored format are byte-identical — the picker changes the input mechanism,
 * not the data. Only fields the user actually changes are sent in the patch, so a
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
  const [hocInches, setHocInches] = useState<number | undefined>(undefined);
  const [clippingBags, setClippingBags] = useState<number | undefined>(undefined);
  const [toolTypes, setToolTypes] = useState<EquipmentType[]>([]);
  const [beforePhotoUri, setBeforePhotoUri] = useState<string | undefined>(undefined);
  const [afterPhotoUri, setAfterPhotoUri] = useState<string | undefined>(undefined);
  const [zones, setZones] = useState<PickerZone[]>([]);
  const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const setPhoto = useCallback((slot: PhotoSlot, uri: string | undefined) => {
    if (slot === 'before') setBeforePhotoUri(uri);
    else setAfterPhotoUri(uri);
  }, []);
  // The mow's job types as loaded, for diffing on save so an untouched selection
  // produces no patch.
  const initialToolsRef = useRef<EquipmentType[]>([]);
  // Zone selection is written ONLY on real user interaction — never from a
  // seeded-vs-stored diff. The seed is a tolerant projection (deleted refs
  // dropped), so it legitimately differs from what's stored; an untouched picker
  // must leave zoneIds byte-identical. Tolerance is read-time; writes need intent.
  const zonesDirtyRef = useRef(false);

  const toggleZone = useCallback((zoneId: string) => {
    zonesDirtyRef.current = true;
    setSelectedZoneIds((prev) =>
      prev.includes(zoneId) ? prev.filter((z) => z !== zoneId) : [...prev, zoneId],
    );
  }, []);

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
        setHocInches(loaded.hocInches);
        setClippingBags(loaded.clippingBags);
        setBeforePhotoUri(loaded.beforePhotoUri);
        setAfterPhotoUri(loaded.afterPhotoUri);
        const loadedTools = loaded.toolTypes ?? [];
        setToolTypes(loadedTools);
        initialToolsRef.current = loadedTools;
        // Load the property's zones and seed the coverage selection. Tolerant:
        // absent zoneIds → all selected (whole lawn); present → those that still
        // exist; if every referenced zone is gone, fall back to all. This seed
        // is display-only — it never writes back unless the user interacts.
        propertyRepository.getById(loaded.propertyId).then((property) => {
          if (!active) return;
          const propZones = property?.zones ?? [];
          const existing = new Set(propZones.map((z) => z.id));
          const kept = loaded.zoneIds?.filter((id) => existing.has(id)) ?? [];
          const seeded = loaded.zoneIds == null || kept.length === 0
            ? propZones.map((z) => z.id) // whole lawn (or all refs deleted)
            : kept;
          setZones(propZones);
          setSelectedZoneIds(seeded);
          zonesDirtyRef.current = false; // seeding is not an edit
        });
      }
    });
    return () => {
      active = false;
    };
  }, [mowId, navigation]);

  const toggleTool = useCallback((type: EquipmentType) => {
    setToolTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }, []);

  // Pickers write back into the same string state the text fields used, so the
  // save/diff path and the stored format are unchanged. Date mode only touches
  // the date part; time mode only the time part. onValueChange fires only on an
  // actual selection, so `selected` is always present (no dismiss guard needed).
  const onValueChangeDate = useCallback((_event: DateTimePickerChangeEvent, selected: Date) => {
    setDateField(formatDateField(selected.getTime()));
  }, []);
  const onValueChangeTime = useCallback((_event: DateTimePickerChangeEvent, selected: Date) => {
    setTimeField(formatTimeField(selected.getTime()));
  }, []);

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

    // Only include HOC when it actually changed; an explicit undefined clears it.
    if (hocInches !== mow.hocInches) {
      patch.hocInches = hocInches;
    }

    // Only include bags when it actually changed; undefined clears, 0 is a value.
    if (clippingBags !== mow.clippingBags) {
      patch.clippingBags = clippingBags;
    }

    // Only include tools when the selection actually changed.
    if (!sameTypes(toolTypes, initialToolsRef.current)) {
      patch.toolTypes = toolTypes;
    }

    // Zone coverage: write ONLY if the user actually touched the picker (dirty).
    // Never from a seeded-vs-stored diff — the tolerant seed drops deleted-zone
    // refs, so it differs from storage whenever a referenced zone was removed;
    // an untouched picker must leave zoneIds byte-identical. All selected
    // collapses to absent (whole lawn), never a full-membership array.
    if (zonesDirtyRef.current) {
      const isAllZones = selectedZoneIds.length === zones.length;
      patch.zoneIds = isAllZones ? undefined : selectedZoneIds;
    }

    // Photo slots: include only a changed slot. A replace sends a fresh picker
    // temp URI (the repository copies it + deletes the old file); a clear sends
    // undefined; an unchanged slot is omitted. Compare against the loaded mow.
    if (beforePhotoUri !== mow.beforePhotoUri) {
      patch.beforePhotoUri = beforePhotoUri;
    }
    if (afterPhotoUri !== mow.afterPhotoUri) {
      patch.afterPhotoUri = afterPhotoUri;
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
  }, [mow, busy, dateField, timeField, minutesField, notes, hocInches, clippingBags, toolTypes, selectedZoneIds, zones, beforePhotoUri, afterPhotoUri, navigation]);

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
        <DateTimePicker
          value={new Date(parseDateTimeField(dateField, timeField) ?? mow.startedAt)}
          mode="date"
          display={Platform.OS === 'ios' ? 'compact' : 'default'}
          onValueChange={onValueChangeDate}
          testID="mow-date-picker"
          accessibilityLabel="Mow date"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Time</Text>
        <DateTimePicker
          value={new Date(parseDateTimeField(dateField, timeField) ?? mow.startedAt)}
          mode="time"
          display={Platform.OS === 'ios' ? 'compact' : 'default'}
          onValueChange={onValueChangeTime}
          testID="mow-time-picker"
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

      {mow.weather && (
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Weather</Text>
          {/* Capture-only provenance (D-040) — read-only, never editable. */}
          <Text style={styles.weatherValue} testID="mow-weather">
            {`${mow.weather.tempF}°F · ${mow.weather.condition}`}
          </Text>
        </View>
      )}

      {mow.activity && (
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Activity</Text>
          {/* Capture-only provenance (D-042) — read-only, never editable. */}
          <Text style={styles.weatherValue} testID="mow-activity">
            {`${formatThousands(mow.activity.steps)} steps · ${mow.activity.distanceMi} mi`}
          </Text>
        </View>
      )}

      <HocField value={hocInches} onChange={setHocInches} disabled={busy} />

      <BagsField value={clippingBags} onChange={setClippingBags} disabled={busy} />

      {/* Zone coverage — multi-zone lawns only (single-zone suppression). */}
      {zones.length >= 2 && (
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Zones covered</Text>
          <ZonePicker
            zones={zones}
            selectedIds={selectedZoneIds}
            onToggle={toggleZone}
            disabled={busy}
          />
        </View>
      )}

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Tools (optional)</Text>
        <ToolTypePicker
          selected={toolTypes}
          onToggle={toggleTool}
          disabled={busy}
          accessibilityLabel="Jobs done"
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

      <PhotoSlots
        before={beforePhotoUri}
        after={afterPhotoUri}
        onChange={setPhoto}
        disabled={busy}
      />

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
  weatherValue: { fontSize: typography.body, color: colors.ink },
  notesInput: { minHeight: 96 },
  button: {
    paddingVertical: spacing.lg,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  deleteText: { color: colors.destructive, fontSize: typography.body, fontWeight: '600' },
  pressed: { opacity: 0.8 },
});
