import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';
import { formatTemp } from './format';

type Props = {
  /** Captured temperature in whole °F. */
  tempF: number;
};

/**
 * Small pill showing a mow's captured temperature (e.g. 72°F) on the log card.
 * Weather is capture-only provenance (D-040); this is display only. Render it
 * only when a mow has weather — there is no "unset" chip (mirrors HocChip).
 */
export default function TempChip({ tempF }: Props) {
  return (
    <View style={styles.chip} testID="mow-temp">
      <Text style={styles.label}>{formatTemp(tempF)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.sand,
  },
  label: {
    fontSize: typography.caption,
    color: colors.ink,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
