import { Modal, StyleSheet, Text, View } from 'react-native';
import Button from '../components/Button';
import { colors, radii, spacing, typography } from '../theme';

/**
 * One-time coaching shown the first time a mow is started. Copy is ASCII only,
 * no em dashes, and pinned by test — three steps and a single dismiss.
 */
export const FIRST_MOW_SHEET_TITLE = 'Your first mow';
export const FIRST_MOW_SHEET_LINES = [
  'Start the timer.',
  'Mow. Keep your phone or watch on you so we can count steps.',
  'Tap Finish, then Save.',
];
export const FIRST_MOW_SHEET_CONFIRM = 'Got it';

export default function FirstMowSheet({
  visible,
  onDismiss,
}: {
  visible: boolean;
  onDismiss: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet} accessibilityViewIsModal>
          <Text style={styles.title}>{FIRST_MOW_SHEET_TITLE}</Text>
          <View style={styles.steps}>
            {FIRST_MOW_SHEET_LINES.map((line, i) => (
              <View key={line} style={styles.step}>
                <Text style={styles.stepNumber}>{i + 1}</Text>
                <Text style={styles.stepText}>{line}</Text>
              </View>
            ))}
          </View>
          <Button
            label={FIRST_MOW_SHEET_CONFIRM}
            variant="primary"
            fullWidth
            onPress={onDismiss}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.xl,
  },
  title: {
    fontSize: typography.heading,
    fontWeight: '700',
    color: colors.ink,
  },
  steps: { gap: spacing.lg },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    color: colors.textOnColor,
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '700',
    fontSize: typography.body,
    overflow: 'hidden',
  },
  stepText: {
    flex: 1,
    fontSize: typography.body,
    color: colors.ink,
  },
});
