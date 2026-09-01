import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from '../components/Button';
import ErrorState from '../components/ErrorState';
import { useAsyncResource } from '../components/useAsyncResource';
import type { RootStackScreenProps } from '../mow/navigation';
import { colors, spacing, typography } from '../theme';
import { equipmentRepository } from './asyncStorageRepositories';
import { EQUIPMENT_TYPES, equipmentTypeLabel } from './catalog';
import EquipmentCard from './EquipmentCard';
import type { Equipment } from './models';

type Props = RootStackScreenProps<'Garage'>;

/**
 * The equipment garage: everything the user owns, grouped by type. Add opens the
 * form; tapping an item opens it for edit/delete. All access goes through the
 * repository interface (D-013) — never AsyncStorage directly.
 */
export default function GarageScreen({ navigation }: Props) {
  // Reloads on focus so a just-added/edited/deleted item is reflected.
  const { status, data: equipment, reload } = useAsyncResource(() =>
    equipmentRepository.list(),
  );

  // A rejected read surfaces the error state instead of hanging on blank.
  if (status === 'error') return <ErrorState onRetry={reload} />;
  // First read in flight: render nothing rather than a flash of the empty state.
  if (equipment === null) return <View style={styles.container} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Button
        label="Add equipment"
        variant="primary"
        fullWidth
        onPress={() => navigation.navigate('EquipmentForm')}
      />

      {equipment.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No equipment yet</Text>
          <Text style={styles.emptyHint}>
            Add your mower, trimmer, and other tools to build your garage.
          </Text>
        </View>
      ) : (
        // Fixed type order; only render a section for a type that has items.
        EQUIPMENT_TYPES.map(({ value: type }) => {
          const items = equipment.filter((e) => e.type === type);
          if (items.length === 0) return null;
          return (
            <View key={type} style={styles.section}>
              <Text style={styles.sectionTitle}>{equipmentTypeLabel(type)}</Text>
              {items.map((item) => (
                <EquipmentCard
                  key={item.id}
                  equipment={item}
                  onPress={() =>
                    navigation.navigate('EquipmentForm', { equipmentId: item.id })
                  }
                />
              ))}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.title,
    fontWeight: '600',
    color: colors.ink,
  },
  emptyHint: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
