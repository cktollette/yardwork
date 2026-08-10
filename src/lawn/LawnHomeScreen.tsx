import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Button from '../components/Button';
import Card from '../components/Card';
import { propertyRepository } from '../mow/asyncStorageRepositories';
import type { Property } from '../mow/models';
import type { RootTabScreenProps } from '../mow/navigation';
import { colors, spacing, typography } from '../theme';
import { hasLawn } from './prompts';

type Props = RootTabScreenProps<'Lawn'>;

/**
 * Lawn tab root. Shows a summary of the saved lawn and launches the full-screen
 * LawnDraw editor (pushed on the root stack). All property access goes through
 * the repository interface (D-013) — never AsyncStorage directly.
 */
export default function LawnHomeScreen({ navigation }: Props) {
  const [property, setProperty] = useState<Property | null>(null);

  // Reload on focus so the summary reflects a boundary just drawn/edited.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      propertyRepository.getOrCreateDefault().then((prop) => {
        if (active) setProperty(prop);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  // First read in flight: render nothing rather than a flash of the empty state.
  if (property === null) return <View style={styles.container} />;

  const drawn = hasLawn(property.boundary);

  return (
    <View style={styles.container}>
      {drawn ? (
        <>
          <Card>
            <Text style={styles.cardLabel}>Lawn area</Text>
            <Text style={styles.cardValue}>
              {`${Math.round(property.areaSqFt as number).toLocaleString()} sq ft`}
            </Text>
          </Card>
          <Button
            label="Edit boundary"
            variant="primary"
            fullWidth
            onPress={() =>
              navigation.navigate('LawnDraw', {
                propertyId: property.id,
                mode: 'edit',
              })
            }
          />
        </>
      ) : (
        <>
          <Text style={styles.explainer}>
            Trace your lawn once to unlock area and efficiency stats.
          </Text>
          <Button
            label="Draw your lawn"
            variant="primary"
            fullWidth
            onPress={() =>
              navigation.navigate('LawnDraw', {
                propertyId: property.id,
                mode: 'create',
              })
            }
          />
        </>
      )}

      <Button
        label="Equipment garage"
        variant="pill"
        fullWidth
        onPress={() => navigation.navigate('Garage')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  cardLabel: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  cardValue: {
    fontSize: typography.heading,
    fontWeight: '600',
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  explainer: {
    fontSize: typography.body,
    color: colors.textSecondary,
  },
});
