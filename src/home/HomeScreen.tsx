import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme';

/**
 * Placeholder Home tab. Real content (streak, recent mows, quick stats) lands
 * in the next PR — this is navigation scaffolding only.
 */
export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Home — coming next PR</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  text: {
    fontSize: typography.body,
    color: colors.textSecondary,
  },
});
