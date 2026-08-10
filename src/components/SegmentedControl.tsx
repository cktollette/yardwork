import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';

export type SegmentOption<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: readonly SegmentOption<T>[];
  /** The selected value, or undefined when nothing is selected yet. */
  value: T | undefined;
  onChange: (value: T) => void;
  disabled?: boolean;
  /** Labels the group for assistive tech, e.g. "Power source". */
  accessibilityLabel?: string;
};

/**
 * A row of selectable pill buttons — one choice at a time. Wraps to multiple
 * lines when the options don't fit. The selected pill fills with the brand
 * green; the rest are bordered surfaces. All values come from theme tokens.
 *
 * Used for the equipment type row, power source, and drive type.
 */
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
  accessibilityLabel,
}: Props<T>) {
  return (
    <View
      style={styles.row}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled }}
            accessibilityLabel={option.label}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.segmentSelected,
              pressed && styles.pressed,
              disabled && styles.disabled,
            ]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {option.label}
            </Text>
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
  segment: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  segmentSelected: {
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
