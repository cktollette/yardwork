import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';

export type ButtonVariant = 'primary' | 'pill' | 'destructive';

type Props = {
  label: string;
  onPress: () => void;
  variant: ButtonVariant;
  disabled?: boolean;
  fullWidth?: boolean;
};

/**
 * Shared action button. Pill-shaped across all variants (the app's established
 * button shape). Every value comes from theme tokens.
 *
 * - primary:     filled brand green; pressed swaps to primaryMuted.
 * - destructive: filled warmed red; pressed dims.
 * - pill:        neutral text-only pill for secondary actions (e.g. Discard).
 */
export default function Button({
  label,
  onPress,
  variant,
  disabled = false,
  fullWidth = false,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        variant === 'primary' && styles.primary,
        variant === 'destructive' && styles.destructive,
        variant === 'pill' && styles.pill,
        pressed && variant === 'primary' && styles.primaryPressed,
        pressed && variant !== 'primary' && styles.pressedDim,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.label, variant === 'pill' && styles.pillLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: { alignSelf: 'stretch' },
  primary: { backgroundColor: colors.primary },
  primaryPressed: { backgroundColor: colors.primaryPressed },
  destructive: { backgroundColor: colors.destructive },
  pill: { backgroundColor: 'transparent' },
  pressedDim: { opacity: 0.7 },
  disabled: { opacity: 0.5 },
  label: {
    color: colors.textOnColor,
    fontSize: typography.title,
    fontWeight: '600',
  },
  pillLabel: {
    color: colors.textSecondary,
    fontSize: typography.body,
    fontWeight: '500',
  },
});
