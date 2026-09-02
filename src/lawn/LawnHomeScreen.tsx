import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Button from '../components/Button';
import Card from '../components/Card';
import ChipRow from '../components/ChipRow';
import ErrorState from '../components/ErrorState';
import { useAsyncResource } from '../components/useAsyncResource';
import { propertyRepository } from '../mow/asyncStorageRepositories';
import type { Property, Zone } from '../mow/models';
import type { RootTabScreenProps } from '../mow/navigation';
import { colors, spacing, typography } from '../theme';
import { GRASS_TYPES } from './grassTypes';
import { hasLawn } from './prompts';
import { totalAreaSqFt } from './zones';

type Props = RootTabScreenProps<'Lawn'>;

function formatArea(sqft: number): string {
  return `${Math.round(sqft).toLocaleString()} sq ft`;
}

/** One editable zone row: rename inline, set grass type, retrace, or delete. */
function ZoneRow({
  zone,
  onRename,
  onSetGrassType,
  onRetrace,
  onDelete,
}: {
  zone: Zone;
  onRename: (zoneId: string, name: string) => void;
  onSetGrassType: (zoneId: string, grassType: string | undefined) => void;
  onRetrace: (zoneId: string) => void;
  onDelete: (zoneId: string, name: string) => void;
}) {
  const [name, setName] = useState(zone.name);
  return (
    <Card>
      <View style={styles.rowTop}>
        <TextInput
          style={styles.nameInput}
          value={name}
          onChangeText={setName}
          onEndEditing={() => {
            const trimmed = name.trim();
            if (trimmed && trimmed !== zone.name) onRename(zone.id, trimmed);
            else setName(zone.name); // ignore blanks; snap back
          }}
          accessibilityLabel={`Zone name for ${zone.name}`}
        />
        <Text style={styles.zoneArea} testID={`zone-area-${zone.id}`}>
          {formatArea(zone.areaSqFt)}
        </Text>
      </View>

      <View style={styles.grassField}>
        <Text style={styles.grassLabel}>Grass type (optional)</Text>
        <ChipRow
          options={GRASS_TYPES}
          selected={zone.grassType}
          onChange={(value) => onSetGrassType(zone.id, value)}
          clearable
          accessibilityLabel={(g) => `Grass type ${g} for ${zone.name}`}
        />
      </View>

      <View style={styles.rowActions}>
        <Pressable
          onPress={() => onRetrace(zone.id)}
          accessibilityRole="button"
          testID={`retrace-${zone.id}`}
          hitSlop={8}
        >
          <Text style={styles.retraceText}>Retrace</Text>
        </Pressable>
        <Pressable
          onPress={() => onDelete(zone.id, zone.name)}
          accessibilityRole="button"
          testID={`delete-${zone.id}`}
          hitSlop={8}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      </View>
    </Card>
  );
}

/**
 * Lawn tab root. A lawn is a set of named zones: this screen lists them with
 * per-zone area and the total, and offers add / rename / retrace / delete.
 * Tapping "Retrace" opens the shared LawnDraw editor parameterized by that zone.
 * All property access goes through the repository interface (D-013).
 */
export default function LawnHomeScreen({ navigation }: Props) {
  // Reloads on focus so the list reflects a zone just drawn/edited/removed.
  // The zone mutations below persist and then reload() — data-wins keeps the
  // current lawn on screen during the re-read, so there is no flash.
  const { status, data: property, reload } = useAsyncResource(() =>
    propertyRepository.getOrCreateDefault(),
  );

  const onRename = useCallback(
    async (zoneId: string, name: string) => {
      if (!property) return;
      await propertyRepository.updateZone(property.id, zoneId, { name });
      reload();
    },
    [property, reload],
  );

  const onSetGrassType = useCallback(
    async (zoneId: string, grassType: string | undefined) => {
      if (!property) return;
      // Present-but-undefined key clears; a value sets it.
      await propertyRepository.updateZone(property.id, zoneId, { grassType });
      reload();
    },
    [property, reload],
  );

  const onRetrace = useCallback(
    (zoneId: string) => {
      if (!property) return;
      navigation.navigate('LawnDraw', { propertyId: property.id, mode: 'edit', zoneId });
    },
    [property, navigation],
  );

  const onAdd = useCallback(() => {
    if (!property) return;
    navigation.navigate('LawnDraw', { propertyId: property.id, mode: 'create' });
  }, [property, navigation]);

  const onDelete = useCallback(
    (zoneId: string, name: string) => {
      if (!property) return;
      Alert.alert('Delete this zone?', `"${name}" will be removed from your lawn.`, [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await propertyRepository.deleteZone(property.id, zoneId);
            reload();
          },
        },
      ]);
    },
    [property, reload],
  );

  // A rejected read surfaces the error state instead of hanging on blank.
  if (status === 'error') return <ErrorState onRetry={reload} />;
  // First read in flight: render nothing rather than a flash of the empty state.
  if (property === null) return <View style={styles.container} />;

  const drawn = hasLawn(property.zones);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {drawn ? (
        <>
          <Card>
            <Text style={styles.cardLabel}>Total lawn area</Text>
            <Text style={styles.cardValue} testID="lawn-total">
              {formatArea(totalAreaSqFt(property.zones))}
            </Text>
          </Card>

          {property.zones.map((zone) => (
            <ZoneRow
              key={zone.id}
              zone={zone}
              onRename={onRename}
              onSetGrassType={onSetGrassType}
              onRetrace={onRetrace}
              onDelete={onDelete}
            />
          ))}

          <Button label="Add zone" variant="primary" fullWidth onPress={onAdd} />
        </>
      ) : (
        <>
          <Text style={styles.explainer}>
            Trace your lawn once to unlock area and efficiency stats. Add more zones
            (front, back, side) any time.
          </Text>
          <Button label="Draw your lawn" variant="primary" fullWidth onPress={onAdd} />
        </>
      )}

      <Button
        label="Equipment garage"
        variant="pill"
        fullWidth
        onPress={() => navigation.navigate('Garage')}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  cardLabel: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  cardValue: {
    fontSize: typography.heading,
    fontWeight: '600',
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  nameInput: {
    flex: 1,
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.xs,
  },
  zoneArea: {
    fontSize: typography.body,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  grassField: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  grassLabel: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  rowActions: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.md,
  },
  retraceText: { color: colors.primary, fontSize: typography.body, fontWeight: '600' },
  deleteText: { color: colors.destructive, fontSize: typography.body, fontWeight: '600' },
  explainer: {
    fontSize: typography.body,
    color: colors.textSecondary,
  },
});
