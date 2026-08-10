import { Pressable, StyleSheet, Text, View } from 'react-native';
import { EQUIPMENT_TYPES, equipmentTypeShortLabel } from '../equipment/catalog';
import type { EquipmentType } from '../equipment/models';
import { colors, radii, spacing, typography } from '../theme';

type Props = {
  /** Currently-selected job types. */
  selected: EquipmentType[];
  onToggle: (type: EquipmentType) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
};

/**
 * The four fixed job-type chips — Mow · Trim · Edge · Blow — as a multi-select.
 * Plain enum values, no garage dependency. Selected chips fill with the brand
 * green; the rest are bordered surfaces. Token-styled.
 */
export default function ToolTypePicker({
  selected,
  onToggle,
  disabled = false,
  accessibilityLabel,
}: Props) {
  const chosen = new Set(selected);
  return (
    <View style={styles.row} accessibilityLabel={accessibilityLabel}>
      {EQUIPMENT_TYPES.map(({ value }) => {
        const isSelected = chosen.has(value);
        const label = equipmentTypeShortLabel(value);
        return (
          <Pressable
            key={value}
            onPress={() => onToggle(value)}
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
