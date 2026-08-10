import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';
import { displayName } from './equipment';
import type { Equipment } from './models';

type Props = {
  equipment: Equipment[];
  /** Ids currently selected. */
  selectedIds: string[];
  onToggle: (id: string) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
};

/**
 * A wrapping row of garage equipment as multi-select toggle chips (label =
 * display name). Selected chips fill with the brand green; the rest are bordered
 * surfaces. The single-select sibling is SegmentedControl; this one allows any
 * number of selections. All values from theme tokens.
 */
export default function EquipmentChips({
  equipment,
  selectedIds,
  onToggle,
  disabled = false,
  accessibilityLabel,
}: Props) {
  const selected = new Set(selectedIds);
  return (
    <View style={styles.row} accessibilityLabel={accessibilityLabel}>
      {equipment.map((item) => {
        const isSelected = selected.has(item.id);
        const label = displayName(item);
        return (
          <Pressable
            key={item.id}
            onPress={() => onToggle(item.id)}
            disabled={disabled}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected, disabled }}
            accessibilityLabel={label}
            style={({ pressed }) => [
              styles.chip,
              isSelected && styles.chipSelected,
              pressed && styles.pressed,
              disabled && styles.disabled,
            ]}
          >
            <Text style={[styles.label, isSelected && styles.labelSelected]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.5 },
  label: {
    fontSize: typography.bodySmall,
    color: colors.ink,
    fontWeight: '600',
  },
  labelSelected: {
    color: colors.textOnColor,
  },
});
