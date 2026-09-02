import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';
import { formatHoc } from './hoc';

type Props = {
  /** Height of cut in inches. */
  value: number;
};

/**
 * Small pill showing a mow's height of cut (e.g. 2.5") on the log card. Render
 * it only when a mow has a HOC — there is no "unset" chip.
 */
export default function HocChip({ value }: Props) {
  return (
    <View style={styles.chip}>
      <Text style={styles.label}>{formatHoc(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
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
    fontVariant: ['tabular-nums'],
  },
});
