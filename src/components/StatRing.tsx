import { StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '../theme';

type Props = {
  value: string | number;
  label: string;
  size?: number;
  ringColor?: string;
};

const DEFAULT_SIZE = 72;
const RING_WIDTH = 4;

/**
 * Circular stat display: a value centered inside a colored ring, with a label
 * beneath.
 *
 * NOTE: react-native-svg is not a dependency, so this is a plain bordered-View
 * circle — a full, uniform ring only. It cannot render a partial/progress arc.
 * If progress rings are needed later, add react-native-svg and swap the
 * implementation; the props are already shaped for that (value/ringColor).
 */
export default function StatRing({
  value,
  label,
  size = DEFAULT_SIZE,
  ringColor = colors.primary,
}: Props) {
  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: ringColor,
          },
        ]}
      >
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 6,
  },
  ring: {
    borderWidth: RING_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  value: {
    fontSize: typography.title,
    fontWeight: '700',
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontSize: typography.caption,
    color: colors.textSecondary,
  },
});
