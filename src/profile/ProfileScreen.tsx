import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { propertyRepository } from '../mow/asyncStorageRepositories';
import type { Property } from '../mow/models';
import type { RootTabScreenProps } from '../mow/navigation';
import { colors, spacing, typography } from '../theme';

type Props = RootTabScreenProps<'Profile'>;

/**
 * The Profile tab (occupies the former Stats slot). Minimal shell for now — the
 * header, location sheet, stats block, and sections list land in the next commit.
 * The display name falls back to "My Lawn" (the default property name).
 */
export default function ProfileScreen(_props: Props) {
  const [property, setProperty] = useState<Property | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      propertyRepository.getOrCreateDefault().then((p) => {
        if (active) setProperty(p);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const displayName = property?.name || 'My Lawn';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.name}>{displayName}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg, gap: spacing.lg },
  header: { gap: spacing.xs },
  name: {
    fontSize: typography.titleLarge,
    fontWeight: '700',
    color: colors.ink,
  },
});
