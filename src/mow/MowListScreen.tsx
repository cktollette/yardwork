import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { mowRepository } from './asyncStorageRepositories';
import { formatDuration, formatMowDate } from './format';
import type { Mow } from './models';
import type { RootStackParamList } from './navigation';
import { colors, radii, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'MowList'>;

/** Reverse-chronological list of saved mows: date, duration, notes preview. */
export default function MowListScreen({ navigation }: Props) {
  const [mows, setMows] = useState<Mow[] | null>(null);

  // Reload whenever the screen regains focus so a freshly saved mow appears.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      mowRepository.listMows().then((loaded) => {
        if (active) setMows(loaded);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  // Still loading the first read: render nothing rather than a flash of "empty".
  if (mows === null) return <View style={styles.container} />;

  if (mows.length === 0) {
    return (
      <View style={[styles.container, styles.empty]}>
        <Text style={styles.emptyTitle}>No mows yet</Text>
        <Text style={styles.emptyHint}>
          Start the timer to log your first mow.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.listContent}
      data={mows}
      keyExtractor={(mow) => mow.id}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => navigation.navigate('MowDetail', { mowId: item.id })}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          accessibilityRole="button"
        >
          <View style={styles.rowHeader}>
            <Text style={styles.date}>{formatMowDate(item.startedAt)}</Text>
            <Text style={styles.duration}>
              {formatDuration(item.durationSeconds)}
            </Text>
          </View>
          {item.notes ? (
            <Text style={styles.notes} numberOfLines={1}>
              {item.notes}
            </Text>
          ) : (
            <Text style={[styles.notes, styles.noNotes]}>No notes</Text>
          )}
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.title,
    fontWeight: '600',
    color: colors.ink,
  },
  emptyHint: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  row: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.ink,
  },
  duration: {
    fontSize: typography.body,
    color: colors.primary,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  notes: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
  },
  noNotes: {
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
