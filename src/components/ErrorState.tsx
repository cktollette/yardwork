import { StyleSheet, Text, View } from 'react-native';
import Button from './Button';
import { colors, spacing, typography } from '../theme';

/**
 * Minimal, tokenized load-error state for the read screens: a message + Retry,
 * centered on the app background. This is the READ half of the app's error
 * convention (reads get a screen-level error state; mutations get an Alert).
 * Anything richer than message + retry is a Phase 2/3 concern.
 */
export default function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Couldn't load</Text>
      <Text style={styles.body}>Something went wrong. Please try again.</Text>
      <Button label="Retry" variant="primary" onPress={onRetry} />
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
    gap: spacing.md,
  },
  title: { fontSize: typography.title, fontWeight: '600', color: colors.ink },
  body: {
    fontSize: typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
