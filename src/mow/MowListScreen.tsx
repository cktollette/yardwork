import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { mowRepository } from './asyncStorageRepositories';
import { formatDuration, formatMowDate } from './format';
import HocChip from './HocChip';
import TempChip from './TempChip';
import type { Mow } from './models';
import type { RootTabScreenProps } from './navigation';
import ToolBadges from './ToolBadges';
import ErrorState from '../components/ErrorState';
import { useAsyncResource } from '../components/useAsyncResource';
import { colors, radii, spacing, typography } from '../theme';

// The Log tab's root screen. Navigates to MowDetail, which pushes on the root
// stack (reachable via the composite navigation prop).
type Props = RootTabScreenProps<'Log'>;

/** Reverse-chronological list of saved mows: date, duration, notes preview. */
export default function MowListScreen({ navigation }: Props) {
  // Reloads whenever the screen regains focus so a freshly saved mow appears.
  const { status, data: mows, reload } = useAsyncResource(() =>
    mowRepository.listMows(),
  );

  // A rejected read surfaces the error state instead of hanging on blank.
  if (status === 'error') return <ErrorState onRetry={reload} />;
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
              {/* Captured temperature (weather is capture-only provenance, D-040).
                  Omitted entirely when a mow has no weather — no placeholder. */}
              {item.weather ? <TempChip tempF={item.weather.tempF} /> : null}
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
          <ToolBadges types={item.toolTypes ?? []} />
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
