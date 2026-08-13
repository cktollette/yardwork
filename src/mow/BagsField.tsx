import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';
import { BAGS_DEFAULT, BAGS_MAX, BAGS_MIN, formatBags, stepBags } from './bags';

type Props = {
  /** Current bag count, or undefined when unset. */
  value: number | undefined;
  /**
   * Value applied when "Add bags" is pressed (seed-on-tap). Falls back to
   * BAGS_DEFAULT when omitted/undefined. Nullish fallback, so a seed of `0`
   * seeds `0` rather than the default.
   */
  seed?: number;
  /** Set a new count, or clear it back to unset with `undefined`. */
  onChange: (value: number | undefined) => void;
  disabled?: boolean;
};

/**
 * Clippings-bags input. Skippable by design and — unlike HocField — it does NOT
 * pre-fill: it starts on the "Add bags" affordance, and only on tap seeds
 * `seed ?? BAGS_DEFAULT`. Once set it becomes a −/+ stepper over the 0–20 range,
 * with a Clear action to return to unset. Value logic lives in bags.ts; this is
 * presentation only.
 */
export default function BagsField({ value, seed, onChange, disabled = false }: Props) {
  const isSet = typeof value === 'number';

  return (
    <View style={styles.field}>
      <Text style={styles.label}>Clippings bags (optional)</Text>

      {isSet ? (
        <View style={styles.row}>
          <Pressable
            onPress={() => onChange(stepBags(value as number, -1))}
            disabled={disabled || (value as number) <= BAGS_MIN}
            accessibilityRole="button"
            accessibilityLabel="Decrease clippings bags"
            style={({ pressed }) => [
              styles.stepper,
              pressed && styles.pressed,
              (disabled || (value as number) <= BAGS_MIN) && styles.stepperDisabled,
            ]}
          >
            <Text style={styles.stepperLabel}>−</Text>
          </Pressable>

          <Text
            style={styles.value}
            accessibilityLabel={`Clippings bags ${formatBags(value as number)}`}
          >
            {value as number}
          </Text>

          <Pressable
            onPress={() => onChange(stepBags(value as number, 1))}
            disabled={disabled || (value as number) >= BAGS_MAX}
            accessibilityRole="button"
            accessibilityLabel="Increase clippings bags"
            style={({ pressed }) => [
              styles.stepper,
              pressed && styles.pressed,
              (disabled || (value as number) >= BAGS_MAX) && styles.stepperDisabled,
            ]}
          >
            <Text style={styles.stepperLabel}>+</Text>
          </Pressable>

          <Pressable
            onPress={() => onChange(undefined)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel="Clear clippings bags"
            style={({ pressed }) => [styles.clear, pressed && styles.pressed]}
          >
            <Text style={styles.clearLabel}>Clear</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => onChange(seed ?? BAGS_DEFAULT)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Add clippings bags"
          style={({ pressed }) => [styles.setButton, pressed && styles.pressed]}
        >
          <Text style={styles.setLabel}>Add bags</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  label: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepper: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperDisabled: { opacity: 0.4 },
  stepperLabel: {
    fontSize: typography.titleLarge,
    color: colors.ink,
    fontWeight: '600',
    lineHeight: typography.titleLarge + 4,
  },
  value: {
    minWidth: 64,
    textAlign: 'center',
    fontSize: typography.titleLarge,
    fontWeight: '600',
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  clear: { marginLeft: 'auto', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  clearLabel: { fontSize: typography.bodySmall, color: colors.textSecondary, fontWeight: '500' },
  setButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  setLabel: { fontSize: typography.body, color: colors.ink, fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
