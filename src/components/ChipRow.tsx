import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';

type Props<T extends string> = {
  /** The selectable values; each is used as its own label. */
  options: readonly T[];
  /** The currently selected value, or undefined when nothing is selected. */
  selected: T | undefined;
  /**
   * Called with the new selection. When `clearable`, tapping the selected chip
   * calls back with `undefined` (deselect); otherwise a tap always selects.
   */
  onChange: (value: T | undefined) => void;
  /** Allow tapping the selected chip to clear it. Default false. */
  clearable?: boolean;
  disabled?: boolean;
  /** Per-chip accessibility label; defaults to the value itself. */
  accessibilityLabel?: (value: T) => string;
};

/**
 * A wrap-around row of single-select chips — the one-tap picker used for
 * Equipment brands and zone grass types. Optional `clearable` makes the
 * selected chip tappable to deselect (for optional fields). Pure presentation;
 * the caller owns the selected value.
 */
export default function ChipRow<T extends string>({
  options,
  selected,
  onChange,
  clearable = false,
  disabled,
  accessibilityLabel,
}: Props<T>) {
  return (
    <View style={styles.chips}>
      {options.map((option) => {
        const isSelected = option === selected;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(clearable && isSelected ? undefined : option)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={accessibilityLabel ? accessibilityLabel(option) : option}
            style={({ pressed }) => [
              styles.chip,
              isSelected && styles.chipSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.sand, borderColor: colors.sand },
  chipText: { fontSize: typography.bodySmall, color: colors.textSecondary },
  chipTextSelected: { color: colors.ink, fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
