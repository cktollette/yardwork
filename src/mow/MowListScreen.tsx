import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { mowRepository } from './asyncStorageRepositories';
import { formatDuration, formatMowDate } from './format';
import type { Mow } from './models';
import type { RootStackParamList } from './navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'MowList'>;

/** Reverse-chronological list of saved mows: date, duration, notes preview. */
export default function MowListScreen(_props: Props) {
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
        <View style={styles.row}>
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
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  emptyHint: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
  },
  row: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  duration: {
    fontSize: 16,
    color: '#16a34a',
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  notes: {
    fontSize: 14,
    color: '#4b5563',
  },
  noNotes: {
    color: '#9ca3af',
    fontStyle: 'italic',
  },
});
