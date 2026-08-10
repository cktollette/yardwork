import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { equipmentRepository } from '../equipment/asyncStorageRepositories';
import type { Equipment } from '../equipment/models';
import { mowRepository } from './asyncStorageRepositories';
import { formatDuration, formatMowDate } from './format';
import HocChip from './HocChip';
import type { Mow } from './models';
import type { RootTabScreenProps } from './navigation';
import ToolBadges from './ToolBadges';
import { mowToolTypes } from './tools';
import { colors, radii, spacing, typography } from '../theme';

// The Log tab's root screen. Navigates to MowDetail, which pushes on the root
// stack (reachable via the composite navigation prop).
type Props = RootTabScreenProps<'Log'>;

/** Reverse-chronological list of saved mows: date, duration, notes preview. */
export default function MowListScreen({ navigation }: Props) {
  const [mows, setMows] = useState<Mow[] | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);

  // Reload whenever the screen regains focus so a freshly saved mow appears.
  // Equipment is loaded alongside mows to resolve tool-type indicators; dangling
  // ids simply don't produce a badge (D-038).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([mowRepository.listMows(), equipmentRepository.list()]).then(
        ([loadedMows, loadedEquipment]) => {
          if (!active) return;
          setMows(loadedMows);
          setEquipment(loadedEquipment);
        },
      );
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
            <View style={styles.rowHeaderLeft}>
              <Text style={styles.date}>{formatMowDate(item.startedAt)}</Text>
              {item.hocInches != null ? <HocChip value={item.hocInches} /> : null}
            </View>
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
          <ToolBadges types={mowToolTypes(item.equipmentIds, equipment)} />
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
  rowHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
