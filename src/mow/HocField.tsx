import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';
import { formatHoc, HOC_DEFAULT, HOC_MAX, HOC_MIN, stepHoc } from './hoc';
import { HOC_GUIDANCE_BODY, HOC_GUIDANCE_TITLE } from './hocGuidance';

type Props = {
  /** Current height of cut in inches, or undefined when unset. */
  value: number | undefined;
  /** Set a new HOC, or clear it back to unset with `undefined`. */
  onChange: (value: number | undefined) => void;
  disabled?: boolean;
};

/**
 * Height-of-cut input. Skippable by design: when unset it shows a "Set HOC"
 * affordance; once set it becomes a −/+ stepper over the 0.5"–4.5" range in
 * 0.25" steps, with a Clear action to return to unset. Value logic lives in
 * hoc.ts; this is presentation only.
 */
export default function HocField({ value, onChange, disabled = false }: Props) {
  const isSet = typeof value === 'number';

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Height of cut (optional)</Text>
        {/* Info affordance: fixed cut-height guidance via the app's existing
            dialog pattern (Alert). Reads only — never touches value/onChange, so
            it can't disrupt the field's tap targets or last-value seeding. Sits
            by the label, clear of the stepper / Set HOC controls below. */}
        <Pressable
          onPress={() => Alert.alert(HOC_GUIDANCE_TITLE, HOC_GUIDANCE_BODY)}
          accessibilityRole="button"
          accessibilityLabel="About height of cut"
          hitSlop={10}
          style={({ pressed }) => [styles.info, pressed && styles.pressed]}
        >
          <Text style={styles.infoGlyph}>ⓘ</Text>
        </Pressable>
      </View>

      {isSet ? (
        <View style={styles.row}>
          <Pressable
            onPress={() => onChange(stepHoc(value as number, -1))}
            disabled={disabled || (value as number) <= HOC_MIN}
            accessibilityRole="button"
            accessibilityLabel="Decrease height of cut"
            style={({ pressed }) => [
              styles.stepper,
              pressed && styles.pressed,
              (disabled || (value as number) <= HOC_MIN) && styles.stepperDisabled,
            ]}
          >
            <Text style={styles.stepperLabel}>−</Text>
          </Pressable>

          <Text style={styles.value} accessibilityLabel={`Height of cut ${formatHoc(value as number)}`}>
            {formatHoc(value as number)}
          </Text>

          <Pressable
            onPress={() => onChange(stepHoc(value as number, 1))}
            disabled={disabled || (value as number) >= HOC_MAX}
            accessibilityRole="button"
            accessibilityLabel="Increase height of cut"
            style={({ pressed }) => [
              styles.stepper,
              pressed && styles.pressed,
              (disabled || (value as number) >= HOC_MAX) && styles.stepperDisabled,
            ]}
          >
            <Text style={styles.stepperLabel}>+</Text>
          </Pressable>

          <Pressable
            onPress={() => onChange(undefined)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel="Clear height of cut"
            style={({ pressed }) => [styles.clear, pressed && styles.pressed]}
          >
            <Text style={styles.clearLabel}>Clear</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => onChange(HOC_DEFAULT)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Set height of cut"
          style={({ pressed }) => [styles.setButton, pressed && styles.pressed]}
        >
          <Text style={styles.setLabel}>Set HOC</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  label: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  info: { paddingHorizontal: spacing.xs },
  infoGlyph: {
    fontSize: typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
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
