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
import ChipRow from '../components/ChipRow';
import SegmentedControl from '../components/SegmentedControl';
import type { RootStackScreenProps } from '../mow/navigation';
import { colors, radii, spacing, typography } from '../theme';
import { equipmentRepository } from './asyncStorageRepositories';
import {
  brandsForType,
  DRIVE_TYPES,
  EQUIPMENT_TYPES,
  POWER_SOURCES,
} from './catalog';
import type { DriveType, EquipmentType, PowerSource } from './models';

type Props = RootStackScreenProps<'EquipmentForm'>;

/**
 * Add or edit a piece of equipment. Type first (like a club-type row), then
 * brand (freeform with one-tap type-aware chips), model, optional nickname,
 * power source, and — mowers only — drive type. Delete is available in edit
 * mode (hard delete, D-027). All persistence goes through the repository.
 */
export default function EquipmentFormScreen({ navigation, route }: Props) {
  const editId = route.params?.equipmentId;
  const isEdit = editId != null;

  const [loading, setLoading] = useState(isEdit);
  const [notFound, setNotFound] = useState(false);
  const [type, setType] = useState<EquipmentType>('mower');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [nickname, setNickname] = useState('');
  const [powerSource, setPowerSource] = useState<PowerSource | undefined>(undefined);
  const [driveType, setDriveType] = useState<DriveType | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Edit equipment' : 'Add equipment' });
  }, [navigation, isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    let active = true;
    equipmentRepository.getById(editId).then((loaded) => {
      if (!active) return;
      if (!loaded) {
        setNotFound(true);
      } else {
        setType(loaded.type);
        setBrand(loaded.brand);
        setModel(loaded.model ?? '');
        setNickname(loaded.nickname ?? '');
        setPowerSource(loaded.powerSource);
        setDriveType(loaded.driveType);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [isEdit, editId]);

  // Changing away from a mower drops any chosen drive type (mower-only).
  const handleTypeChange = useCallback((next: EquipmentType) => {
    setType(next);
    if (next !== 'mower') setDriveType(undefined);
  }, []);

  const handleSave = useCallback(async () => {
    if (busy) return;

    const trimmedBrand = brand.trim();
    const trimmedModel = model.trim();
    // Model is optional (testers often don't have a model number handy); only
    // brand and power source block a save. A blank model is dropped by
    // normalization, so passing it through is safe.
    if (!trimmedBrand || !powerSource) {
      Alert.alert('Missing details', 'Add a brand and power source before saving.');
      return;
    }

    setBusy(true);
    try {
      const driveForType = type === 'mower' ? driveType : undefined;
      if (isEdit) {
        await equipmentRepository.update(editId, {
          type,
          brand: trimmedBrand,
          model: trimmedModel,
          nickname, // blank clears via normalization
          powerSource,
          driveType: driveForType,
        });
      } else {
        await equipmentRepository.add({
          type,
          brand: trimmedBrand,
          model: trimmedModel,
          nickname,
          powerSource,
          driveType: driveForType,
        });
      }
      navigation.goBack();
    } catch {
      setBusy(false);
      Alert.alert("Couldn't save", 'Please try again.');
    }
  }, [busy, brand, model, nickname, powerSource, type, driveType, isEdit, editId, navigation]);

  const handleDelete = useCallback(() => {
    if (!isEdit || busy) return;
    Alert.alert('Delete this equipment?', 'This permanently removes it from your garage.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await equipmentRepository.delete(editId);
            navigation.goBack();
          } catch {
            setBusy(false);
            Alert.alert("Couldn't delete this equipment", 'Please try again.');
          }
        },
      },
    ]);
  }, [isEdit, busy, editId, navigation]);

  if (loading) return <View style={styles.container} />;

  if (notFound) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.gone}>This equipment is no longer in your garage.</Text>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button">
          <Text style={styles.backLink}>Back to garage</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.field}>
        <Text style={styles.label}>Type</Text>
        <SegmentedControl
          options={EQUIPMENT_TYPES}
          value={type}
          onChange={handleTypeChange}
          disabled={busy}
          accessibilityLabel="Equipment type"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Brand</Text>
        <TextInput
          style={styles.input}
          value={brand}
          onChangeText={setBrand}
          placeholder="e.g. Toro"
          placeholderTextColor={colors.textMuted}
          editable={!busy}
          accessibilityLabel="Brand"
        />
        <ChipRow
          options={brandsForType(type)}
          selected={brand || undefined}
          onChange={(b) => setBrand(b ?? '')}
          disabled={busy}
          accessibilityLabel={(b) => `Brand ${b}`}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Model (optional)</Text>
        <TextInput
          style={styles.input}
          value={model}
          onChangeText={setModel}
          placeholder="e.g. Recycler 22"
          placeholderTextColor={colors.textMuted}
          editable={!busy}
          accessibilityLabel="Model"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Nickname (optional)</Text>
        <TextInput
          style={styles.input}
          value={nickname}
          onChangeText={setNickname}
          placeholder="e.g. Old Reliable"
          placeholderTextColor={colors.textMuted}
          editable={!busy}
          accessibilityLabel="Nickname"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Power source</Text>
        <SegmentedControl
          options={POWER_SOURCES}
          value={powerSource}
          onChange={setPowerSource}
          disabled={busy}
          accessibilityLabel="Power source"
        />
      </View>

      {type === 'mower' ? (
        <View style={styles.field}>
          <Text style={styles.label}>Drive type (optional)</Text>
          <SegmentedControl
            options={DRIVE_TYPES}
            value={driveType}
            onChange={setDriveType}
            disabled={busy}
            accessibilityLabel="Drive type"
          />
        </View>
      ) : null}

      <Button
        label={busy ? 'Saving…' : 'Save equipment'}
        variant="primary"
        fullWidth
        disabled={busy}
        onPress={handleSave}
      />

      {isEdit ? (
        <Pressable
          onPress={handleDelete}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Delete equipment"
          style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
        >
          <Text style={styles.deleteText}>Delete equipment</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing.xl,
    gap: spacing.xl,
    backgroundColor: colors.background,
    flexGrow: 1,
  },
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  gone: { fontSize: typography.body, color: colors.textSecondary, textAlign: 'center' },
  backLink: { fontSize: typography.body, color: colors.primary, fontWeight: '600' },
  field: { gap: spacing.sm },
  label: {
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
  deleteButton: {
    paddingVertical: spacing.lg,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  deleteText: { color: colors.destructive, fontSize: typography.body, fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
