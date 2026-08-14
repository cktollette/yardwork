import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from '../components/Button';
import Card from '../components/Card';
import StatRing from '../components/StatRing';
import { mowRepository, propertyRepository } from '../mow/asyncStorageRepositories';
import { formatDuration, formatMowDate } from '../mow/format';
import type { Mow, Property } from '../mow/models';
import type { RootTabScreenProps } from '../mow/navigation';
import { deriveStats } from '../stats/deriveStats';
import { coveredAreaSqFt, totalAreaSqFt } from '../lawn/zones';
import { colors, spacing, typography } from '../theme';

type Props = RootTabScreenProps<'Home'>;

/** Compact number for the small stat rings (e.g. 52,340 sq ft -> "52k"). */
function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1_000)}k`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}

/**
 * The Home tab: a card-based dashboard. All data comes through the repository
 * interfaces (D-013); the derived numbers come from the shared deriveStats
 * module. Refreshes on focus so a just-saved mow shows up on return.
 */
export default function HomeScreen({ navigation }: Props) {
  const [mows, setMows] = useState<Mow[] | null>(null);
  const [property, setProperty] = useState<Property | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([
        mowRepository.listMows(),
        propertyRepository.getOrCreateDefault(),
      ]).then(([loadedMows, prop]) => {
        if (!active) return;
        setMows(loadedMows);
        setProperty(prop);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  // First read in flight: render nothing rather than a flash of the empty state.
  if (mows === null || property === null) return <View style={styles.container} />;

  // Cold start: no mow ever logged.
  if (mows.length === 0) {
    return (
      <View style={[styles.container, styles.emptyWrap]}>
        <Card>
          <Text style={styles.welcomeTitle}>Welcome to Klippa</Text>
          <Text style={styles.welcomeBody}>
            Tap the green Mow button to time and log your first mow. Your streak
            starts with one.
          </Text>
          <View style={styles.welcomeAction}>
            <Button
              label="Log your first mow"
              variant="primary"
              fullWidth
              onPress={() => navigation.navigate('Timer')}
            />
          </View>
        </Card>
      </View>
    );
  }

  // Total lawn area = sum of zone areas; null (no zones) keeps area stats gated.
  const totalArea = totalAreaSqFt(property.zones);
  const areaSqFt = totalArea > 0 ? totalArea : null;
  // Each mow contributes the area it covered (per its zone selection) so partial
  // mows don't skew efficiency; absent zoneIds resolves to the whole lawn.
  const stats = deriveStats(
    mows.map((m) => ({ ...m, coveredAreaSqFt: coveredAreaSqFt(m.zoneIds, property.zones) })),
    { areaSqFt, now: Date.now() },
  );
  const lastMow = mows[0]; // listMows returns newest-first
  const streak = stats.currentStreakWeeks;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.heroCard}>
        <Text style={styles.heroNumber}>{streak}</Text>
        <Text style={styles.heroLabel}>week streak</Text>
        {streak === 0 && (
          <Text style={styles.heroRestart}>
            Mow this week to start a new streak.
          </Text>
        )}
      </Card>

      <Pressable
        onPress={() => navigation.navigate('MowDetail', { mowId: lastMow.id })}
        accessibilityRole="button"
        style={({ pressed }) => pressed && styles.pressed}
      >
        <Card>
          <Text style={styles.cardLabel}>Last mow</Text>
          <Text style={styles.cardValue}>{formatMowDate(lastMow.startedAt)}</Text>
          <Text style={styles.cardMeta}>
            {formatDuration(lastMow.durationSeconds)}
            {areaSqFt !== null
              ? ` · ${Math.round(areaSqFt).toLocaleString()} sq ft`
              : ''}
          </Text>
        </Card>
      </Pressable>

      <Card>
        <Text style={styles.cardLabel}>Season totals</Text>
        <View style={styles.rings}>
          <StatRing value={stats.lifetimeMows} label="mows" />
          <StatRing value={stats.lifetimeHours.toFixed(1)} label="hours" />
          <StatRing
            value={stats.lifetimeAreaSqFt !== null ? compact(stats.lifetimeAreaSqFt) : '—'}
            label="sq ft"
          />
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  emptyWrap: {
    padding: spacing.lg,
    justifyContent: 'center',
  },
  heroCard: {
    alignItems: 'center',
  },
  heroNumber: {
    fontSize: typography.display,
    fontWeight: '700',
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  heroLabel: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.xs,
  },
  heroRestart: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  cardLabel: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  cardValue: {
    fontSize: typography.titleLarge,
    fontWeight: '600',
    color: colors.ink,
  },
  cardMeta: {
    fontSize: typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  rings: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.sm,
  },
  welcomeTitle: {
    fontSize: typography.heading,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  welcomeBody: {
    fontSize: typography.body,
    color: colors.textSecondary,
  },
  welcomeAction: {
    marginTop: spacing.lg,
  },
  pressed: {
    opacity: 0.7,
  },
});
