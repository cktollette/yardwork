import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from '../components/Button';
import { mowRepository, propertyRepository } from '../mow/asyncStorageRepositories';
import type { Property } from '../mow/models';
import type { RootTabScreenProps } from '../mow/navigation';
import { hasLawn } from '../lawn/prompts';
import { coveredAreaSqFt, totalAreaSqFt } from '../lawn/zones';
import { colors, radii, spacing, typography } from '../theme';
import { formatHoc } from '../mow/hoc';
import {
  deriveStats,
  MIN_MOWS_FOR_AVERAGES,
  MIN_MOWS_FOR_AVG_HOC,
  type Stats,
} from './deriveStats';

type Props = RootTabScreenProps<'Stats'>;

function weeks(n: number): string {
  return `${n} ${n === 1 ? 'week' : 'weeks'}`;
}

/** One label/value line. */
function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

/** A locked section: shows the unlock hint in place of the gated stats. */
function LockedHint({ text }: { text: string }) {
  return <Text style={styles.hint}>{text}</Text>;
}

export default function StatsScreen({ navigation }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [property, setProperty] = useState<Property | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([
        mowRepository.listMows(),
        propertyRepository.getOrCreateDefault(),
      ]).then(([mows, prop]) => {
        if (!active) return;
        setProperty(prop);
        // The lawn area (once drawn) unlocks the area-based stats; until then
        // it's null and those stats stay gated behind "Draw your lawn".
        setStats(
          // Total lawn area = sum of zone areas; 0 (no zones) reads as "no
          // polygon" inside deriveStats and keeps the area stats gated. Each mow
          // contributes the area IT covered (per its zone selection), resolved
          // here so partial mows don't skew efficiency.
          deriveStats(
            mows.map((m) => ({ ...m, coveredAreaSqFt: coveredAreaSqFt(m.zoneIds, prop.zones) })),
            { areaSqFt: totalAreaSqFt(prop.zones), now: Date.now() },
          ),
        );
      });
      return () => {
        active = false;
      };
    }, []),
  );

  // First read in flight: render nothing rather than a flash of empty stats.
  if (stats === null || property === null) return <View style={styles.container} />;

  const lawnDrawn = hasLawn(property.zones);

  const averagesLocked = stats.avgDaysBetweenMows === null;
  const remainingForAverages = Math.max(0, MIN_MOWS_FOR_AVERAGES - stats.lifetimeMows);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lawn</Text>
        {lawnDrawn ? (
          <>
            <StatRow
              label="Area"
              value={`${Math.round(totalAreaSqFt(property.zones)).toLocaleString()} sq ft`}
            />
            <Pressable
              // A lawn now has multiple zones; edit them on the Lawn tab.
              onPress={() => navigation.navigate('Lawn')}
              accessibilityRole="button"
            >
              <Text style={styles.lawnLink}>Manage zones</Text>
            </Pressable>
          </>
        ) : (
          <>
            <LockedHint text="Draw your lawn to unlock area & efficiency stats" />
            <Button
              label="Draw your lawn"
              variant="primary"
              onPress={() =>
                navigation.navigate('LawnDraw', {
                  propertyId: property.id,
                  mode: 'create',
                })
              }
            />
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lifetime</Text>
        <StatRow label="Mows" value={String(stats.lifetimeMows)} />
        <StatRow label="Time" value={`${stats.lifetimeHours.toFixed(1)} h`} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cadence</Text>
        {averagesLocked ? (
          <LockedHint
            text={`Log ${remainingForAverages} more mow${
              remainingForAverages === 1 ? '' : 's'
            } to unlock averages`}
          />
        ) : (
          <>
            <StatRow
              label="Avg days between mows"
              value={(stats.avgDaysBetweenMows as number).toFixed(1)}
            />
            <StatRow
              label="Mows / week (30d)"
              value={(stats.avgMowsPerWeek30d as number).toFixed(1)}
            />
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Height of Cut</Text>
        {stats.averageHocInches === null ? (
          <LockedHint
            text={`Log ${MIN_MOWS_FOR_AVG_HOC} mows with a height of cut to unlock average HOC`}
          />
        ) : (
          <StatRow label="Average HOC" value={formatHoc(stats.averageHocInches)} />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Streaks</Text>
        <StatRow label="Current" value={weeks(stats.currentStreakWeeks)} />
        <StatRow label="Longest" value={weeks(stats.longestStreakWeeks)} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Efficiency</Text>
        {stats.sqFtPerMinute === null ? (
          <LockedHint text="Draw your lawn to unlock efficiency" />
        ) : (
          <>
            <StatRow
              label="Area mowed"
              value={`${Math.round(stats.lifetimeAreaSqFt as number).toLocaleString()} sq ft`}
            />
            <StatRow
              label="Efficiency"
              value={`${Math.round(stats.sqFtPerMinute).toLocaleString()} sq ft/min`}
            />
          </>
        )}
      </View>
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
    gap: spacing.xl,
  },
  section: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  sectionTitle: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: typography.body,
    color: colors.textSecondary,
  },
  rowValue: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    fontSize: typography.bodySmall,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  lawnLink: {
    fontSize: typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
});
