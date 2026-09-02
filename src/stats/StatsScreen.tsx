import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from '../components/Button';
import ErrorState from '../components/ErrorState';
import { useAsyncResource } from '../components/useAsyncResource';
import { mowRepository, propertyRepository } from '../mow/asyncStorageRepositories';
import type { RootStackScreenProps } from '../mow/navigation';
import { hasLawn } from '../lawn/prompts';
import { coveredAreaSqFt, totalAreaSqFt } from '../lawn/zones';
import { colors, radii, spacing, typography } from '../theme';
import { formatHoc } from '../mow/hoc';
import { equipmentTypeLabel } from '../equipment/catalog';
import type { ToolUsage } from '../mow/tools';
import {
  deriveStats,
  MIN_MOWS_FOR_AVERAGES,
  MIN_MOWS_FOR_AVG_HOC,
  MIN_MOWS_FOR_MOST_USED_TOOL,
} from './deriveStats';

type Props = RootStackScreenProps<'Statistics'>;

function weeks(n: number): string {
  return `${n} ${n === 1 ? 'week' : 'weeks'}`;
}

/** "Trimmer · 8 mows" — tool label with the count of mows that recorded it. */
function toolValue(usage: ToolUsage): string {
  return `${equipmentTypeLabel(usage.type)} · ${usage.count} ${
    usage.count === 1 ? 'mow' : 'mows'
  }`;
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
  const { status, data, reload } = useAsyncResource(() =>
    Promise.all([
      mowRepository.listMows(),
      propertyRepository.getOrCreateDefault(),
    ]).then(([mows, prop]) => ({
      property: prop,
      // The lawn area (once drawn) unlocks the area-based stats; until then it's
      // 0 and those stats stay gated behind "Draw your lawn". Total lawn area =
      // sum of zone areas; 0 (no zones) reads as "no polygon" inside deriveStats.
      // Each mow contributes the area IT covered (per its zone selection),
      // resolved here so partial mows don't skew efficiency.
      stats: deriveStats(
        mows.map((m) => ({ ...m, coveredAreaSqFt: coveredAreaSqFt(m.zoneIds, prop.zones) })),
        { areaSqFt: totalAreaSqFt(prop.zones), now: Date.now() },
      ),
    })),
  );

  // A rejected read surfaces the error state instead of hanging on blank.
  if (status === 'error') return <ErrorState onRetry={reload} />;
  // First read in flight: render nothing rather than a flash of empty stats.
  if (data === null) return <View style={styles.container} />;
  const { stats, property } = data;

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
              // A lawn now has multiple zones; edit them on the Lawn tab. This
              // screen is now pushed on the root stack, so reach the tab via Tabs.
              onPress={() => navigation.navigate('Tabs', { screen: 'Lawn' })}
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
        <Text style={styles.sectionTitle}>Tools</Text>
        {stats.mostUsedTool === null ? (
          <LockedHint
            text={`Log ${MIN_MOWS_FOR_MOST_USED_TOOL} mows with a tool to unlock your most-used tool`}
          />
        ) : (
          <>
            <StatRow label="Most-used tool" value={toolValue(stats.mostUsedTool)} />
            {stats.runnerUpTool !== null && (
              <StatRow label="Runner-up" value={toolValue(stats.runnerUpTool)} />
            )}
          </>
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
    backgroundColor: colors.background,
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
