import { StyleSheet, Text, View } from 'react-native';
import { equipmentTypeShortLabel } from '../equipment/catalog';
import type { EquipmentType } from '../equipment/models';
import { colors, radii, spacing, typography } from '../theme';

type Props = {
  /** Job types performed, already deduped/ordered (see normalizeToolTypes). */
  types: EquipmentType[];
};

/**
 * At-a-glance "weed-eat, edge, blow" indicators on a mow card: one small pill
 * per tool type used (Mow / Trim / Edge / Blow). Renders nothing when empty, so
 * callers can drop it in unconditionally. Token-styled.
 */
export default function ToolBadges({ types }: Props) {
  if (types.length === 0) return null;
  return (
    <View style={styles.row}>
      {types.map((type) => (
        <View key={type} style={styles.badge}>
          <Text style={styles.label}>{equipmentTypeShortLabel(type)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    fontSize: typography.caption,
    color: colors.ink,
    fontWeight: '600',
  },
});
